'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Container } from '@/components/layouts/container';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  vehicleModel: string;
  vehiclePlate: string;
  averageRating: number;
  totalRides: number;
  age?: number;
  drivingExperienceYears?: number;
  mototaxiNumber?: string;
  bio?: string;
  profilePhotoUrl?: string;
  user?: {
    name: string;
    email: string;
  };
}

// Helper para detectar valores temporales generados en signup
const isTempValue = (value: string | undefined | null): boolean => {
  if (!value) return true;
  return value.startsWith('TEMP-') || value === 'Por configurar';
};

export default function DriverProfile() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    drivingExperienceYears: '',
    mototaxiNumber: '',
    bio: '',
    vehicleModel: '',
    licenseNumber: '',
    vehiclePlate: '',
  });

  useEffect(() => {
    if (!session?.user?.id) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/drivers/profile');
        if (res.ok) {
          const data = await res.json();
          setDriver(data);
          setFormData({
            name: data.user?.name || '',
            age: data.age?.toString() || '',
            drivingExperienceYears: data.drivingExperienceYears?.toString() || '',
            mototaxiNumber: data.mototaxiNumber || '',
            bio: data.bio || '',
            vehicleModel: isTempValue(data.vehicleModel) ? '' : data.vehicleModel,
            licenseNumber: isTempValue(data.licenseNumber) ? '' : data.licenseNumber,
            vehiclePlate: isTempValue(data.vehiclePlate) ? '' : data.vehiclePlate,
          });
        } else {
          toast.error('Error al cargar el perfil');
        }
      } catch (error) {
        toast.error('Error al cargar el perfil');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const presignRes = await fetch('/api/drivers/profile-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      });

      if (!presignRes.ok) {
        const error = await presignRes.json();
        toast.error(error.message || 'Error al procesar la foto');
        return;
      }

      const { presignedUrl, publicUrl } = await presignRes.json();

      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'Content-Disposition': 'attachment',
        },
      });

      if (uploadRes.ok) {
        setDriver((prev) => prev ? { ...prev, profilePhotoUrl: publicUrl } : null);
        toast.success('Foto de perfil actualizada');
      } else {
        toast.error('Error al subir la foto');
      }
    } catch (error) {
      toast.error('Error al subir la foto');
      console.error(error);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData: Record<string, unknown> = {};

      if (formData.name.trim()) updateData.name = formData.name.trim();
      if (formData.age) updateData.age = parseInt(formData.age);
      if (formData.drivingExperienceYears) updateData.drivingExperienceYears = parseInt(formData.drivingExperienceYears);
      if (formData.mototaxiNumber.trim()) updateData.mototaxiNumber = formData.mototaxiNumber.trim();
      updateData.bio = formData.bio.trim();
      if (formData.vehicleModel.trim()) updateData.vehicleModel = formData.vehicleModel.trim();
      if (formData.licenseNumber.trim()) updateData.licenseNumber = formData.licenseNumber.trim();
      if (formData.vehiclePlate.trim()) updateData.vehiclePlate = formData.vehiclePlate.trim();

      const res = await fetch('/api/drivers/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const updated = await res.json();
        setDriver(updated);
        toast.success('¡Perfil actualizado correctamente!');
      } else {
        const error = await res.json();
        toast.error(error.message || 'Error al actualizar el perfil');
      }
    } catch (error) {
      toast.error('Error al actualizar el perfil');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </Container>
    );
  }

  if (!driver) {
    return (
      <Container className="py-8">
        <div className="text-center text-destructive">Conductor no encontrado</div>
      </Container>
    );
  }

  return (
    <Container className="py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/driver/dashboard">
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold font-display">Mi Perfil</h1>
      </div>

      <div className="max-w-lg mx-auto space-y-5">
        {/* Photo + Stats Card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-5">
            {/* Photo */}
            <div className="relative flex-shrink-0">
              <div className="relative w-20 h-20">
                {driver.profilePhotoUrl ? (
                  <Image
                    src={driver.profilePhotoUrl}
                    alt="Foto de perfil"
                    fill
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-bold">
                    {driver.user?.name?.charAt(0).toUpperCase() || 'D'}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-1.5 shadow-md transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Name + Stats */}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold truncate">{driver.user?.name}</p>
              <p className="text-sm text-muted-foreground truncate">{driver.user?.email}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium">{driver.averageRating.toFixed(1)}</span>
                </div>
                <span className="text-sm text-muted-foreground">{driver.totalRides} viajes</span>
              </div>
            </div>
          </div>
          {uploadingPhoto && (
            <div className="mt-3">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Subiendo foto...</p>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold font-display">Información Personal</h2>

          <div>
            <Label htmlFor="name">Nombre Completo</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Tu nombre completo"
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="age">Edad</Label>
              <Input
                id="age"
                name="age"
                type="number"
                min="18"
                max="120"
                placeholder="Ej: 30"
                value={formData.age}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="drivingExperienceYears">Años Manejando</Label>
              <Input
                id="drivingExperienceYears"
                name="drivingExperienceYears"
                type="number"
                min="0"
                max="70"
                placeholder="Ej: 5"
                value={formData.drivingExperienceYears}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold font-display pt-2">Datos del Vehículo</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mototaxiNumber">No. de Mototaxi</Label>
              <Input
                id="mototaxiNumber"
                name="mototaxiNumber"
                type="text"
                placeholder="Ej: MTX-001"
                value={formData.mototaxiNumber}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vehicleModel">Modelo</Label>
              <Input
                id="vehicleModel"
                name="vehicleModel"
                type="text"
                placeholder="Ej: Honda Wave 110"
                value={formData.vehicleModel}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="licenseNumber">No. de Licencia</Label>
              <Input
                id="licenseNumber"
                name="licenseNumber"
                type="text"
                placeholder="Tu número de licencia"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vehiclePlate">Placa</Label>
              <Input
                id="vehiclePlate"
                name="vehiclePlate"
                type="text"
                placeholder="Ej: ABC-1234"
                value={formData.vehiclePlate}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Biografía Breve</Label>
            <textarea
              id="bio"
              name="bio"
              placeholder="Ej: Soy conductor con 5 años de experiencia..."
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              maxLength={200}
              style={{ minHeight: '100px', fontSize: '16px' }}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-secondary/50 text-foreground placeholder:text-muted-foreground/60 resize-vertical"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{formData.bio.length}/200</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Link href="/driver/dashboard" className="flex-1">
              <Button
                type="button"
                variant="outline"
                className="w-full border-border/50"
              >
                Volver
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </Container>
  );
}
