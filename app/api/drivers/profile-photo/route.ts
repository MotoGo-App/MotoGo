export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/s3';
import { profilePhotoDriverSchema } from './schema';
import { validateBody } from '@/lib/http';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const validation = await validateBody(request, profilePhotoDriverSchema);
    if (!validation.ok) return validation.response;
    const { fileName, fileSize, fileType } = validation.data;

    const driver = await withRetry(() =>
      prisma.driver.findUnique({
        where: { userId: session.user!.id },
      })
    );

    if (!driver) {
      return NextResponse.json({ message: 'Conductor no encontrado' }, { status: 404 });
    }

    // Generar nombre único para el archivo
    const extension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `driver-photo-${session.user.id}-${Date.now()}.${extension}`;

    // Generar URL presignada (foto de perfil es pública)
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      uniqueFileName,
      fileType,
      true // isPublic - profile photos need to be publicly visible
    );

    // Obtener URL pública para la foto
    const publicUrl = await getFileUrl(cloud_storage_path, true);

    // Actualizar perfil del conductor con la URL de la foto
    await withRetry(() =>
      prisma.driver.update({
        where: { id: driver.id },
        data: { profilePhotoUrl: publicUrl },
      })
    );

    return NextResponse.json({
      presignedUrl: uploadUrl,
      publicUrl,
      cloud_storage_path,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ message: 'Error al procesar la foto' }, { status: 500 });
  }
}
