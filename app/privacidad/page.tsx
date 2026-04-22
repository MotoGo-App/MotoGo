'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Lock, Eye, FileText, UserCheck, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const lastUpdated = '17 de abril de 2026';

  return (
    <div className="min-h-screen hero-gradient">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/motogo-logo.png"
              alt="MotoGo"
              width={120}
              height={65}
              unoptimized
              className="h-8 w-auto"
            />
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="glass-card border-border/50 hover:bg-secondary/50">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground mb-2">
            Aviso de Privacidad
          </h1>
          <p className="text-muted-foreground">
            Última actualización: {lastUpdated}
          </p>
        </div>

        {/* Introduction */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <p className="text-foreground leading-relaxed">
            En <strong>MotoGo</strong> (&quot;nosotros&quot;, &quot;nuestro&quot; o &quot;la Plataforma&quot;) nos comprometemos a proteger la privacidad y los datos personales de nuestros usuarios. El presente Aviso de Privacidad tiene por objeto informarle sobre el tratamiento que daremos a sus datos personales, en cumplimiento con la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> de México, su Reglamento y demás disposiciones aplicables.
          </p>
        </div>

        {/* Section 1: Responsable */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">1. Responsable del tratamiento</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">MotoGo</strong>, con operaciones en la República Mexicana, es responsable del tratamiento, uso y protección de los datos personales que usted proporciona al utilizar nuestra plataforma de transporte mediante mototaxis.
          </p>
        </section>

        {/* Section 2: Data collected */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">2. Datos personales que recabamos</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Para las finalidades señaladas en este Aviso, podemos recabar los siguientes datos personales:
          </p>
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Datos de identificación:</h3>
              <p className="text-muted-foreground text-sm">Nombre completo, correo electrónico, número de teléfono, fotografía de perfil.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Datos de conductores (adicionales):</h3>
              <p className="text-muted-foreground text-sm">Número de licencia de conducir, placas del vehículo, modelo del vehículo.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Datos de geolocalización:</h3>
              <p className="text-muted-foreground text-sm">Ubicación en tiempo real durante el uso de la aplicación para funciones del servicio (solicitud y seguimiento de viajes).</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Datos de uso del servicio:</h3>
              <p className="text-muted-foreground text-sm">Historial de viajes, direcciones de origen y destino, calificaciones, mensajes de chat dentro de la plataforma, información de pagos.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Datos técnicos:</h3>
              <p className="text-muted-foreground text-sm">Dirección IP, tipo de dispositivo, información del navegador, cookies y tecnologías similares.</p>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-sm text-foreground">
              <strong>Nota:</strong> No recabamos datos personales sensibles (como preferencias sexuales, creencias religiosas, estado de salud, etc.) ya que no son necesarios para la prestación del servicio.
            </p>
          </div>
        </section>

        {/* Section 3: Purposes */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">3. Finalidades del tratamiento</h2>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Finalidades primarias (necesarias para el servicio):</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>Crear, administrar y autenticar su cuenta en la Plataforma.</li>
                <li>Conectar a clientes con conductores cercanos.</li>
                <li>Gestionar solicitudes, seguimiento y finalización de viajes.</li>
                <li>Procesar pagos y emitir comprobantes.</li>
                <li>Facilitar comunicación entre clientes y conductores durante los viajes.</li>
                <li>Verificar la identidad y elegibilidad de los conductores.</li>
                <li>Gestionar calificaciones y opiniones del servicio.</li>
                <li>Atender consultas, reportes y soporte al usuario.</li>
                <li>Cumplir con obligaciones legales, fiscales y regulatorias aplicables.</li>
                <li>Garantizar la seguridad de los usuarios y prevenir fraudes.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Finalidades secundarias (no necesarias):</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>Realizar análisis estadísticos para mejorar nuestros servicios.</li>
                <li>Enviar notificaciones sobre nuevas funcionalidades o promociones.</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2 italic">
                Si usted desea oponerse al tratamiento de sus datos para estas finalidades secundarias, puede manifestarlo contactándonos a través de los medios indicados en la sección 8.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Sharing */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">4. Transferencia de datos</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Para la correcta operación del servicio, compartimos información limitada con:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-2">
            <li><strong className="text-foreground">Entre usuarios de la plataforma:</strong> cuando un cliente solicita un viaje, su nombre y ubicación de recogida se comparten con el conductor asignado, y viceversa (nombre, foto, modelo de vehículo y placas del conductor se comparten con el cliente), únicamente con fines operativos del viaje.</li>
            <li><strong className="text-foreground">Proveedores de servicios tecnológicos:</strong> hosting, bases de datos, mapas, procesadores de pagos, los cuales están obligados contractualmente a proteger sus datos.</li>
            <li><strong className="text-foreground">Autoridades competentes:</strong> cuando sea requerido por ley, orden judicial o para la protección de derechos.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            <strong className="text-foreground">No vendemos ni comercializamos sus datos personales a terceros.</strong>
          </p>
        </section>

        {/* Section 5: ARCO Rights */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">5. Sus Derechos ARCO</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Usted tiene derecho a:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-2">
            <li><strong className="text-foreground">Acceso:</strong> conocer qué datos personales tenemos sobre usted y cómo los usamos.</li>
            <li><strong className="text-foreground">Rectificación:</strong> solicitar la corrección de su información cuando sea incorrecta o incompleta.</li>
            <li><strong className="text-foreground">Cancelación:</strong> solicitar que eliminemos sus datos de nuestros registros cuando considere que no son necesarios.</li>
            <li><strong className="text-foreground">Oposición:</strong> oponerse al uso de sus datos personales para fines específicos.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Asimismo, puede <strong className="text-foreground">revocar su consentimiento</strong> en cualquier momento y solicitar la eliminación de su cuenta. Para ello, contáctenos a través de los medios indicados en la sección 8.
          </p>
        </section>

        {/* Section 6: Security */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">6. Medidas de seguridad</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Implementamos medidas de seguridad técnicas, administrativas y físicas razonables para proteger sus datos personales contra daño, pérdida, alteración, destrucción o uso, acceso o tratamiento no autorizado. Entre estas medidas se incluyen: cifrado de contraseñas, conexiones seguras (HTTPS), almacenamiento en infraestructura de nube con controles de acceso, y revisiones periódicas de nuestros sistemas.
          </p>
        </section>

        {/* Section 7: Retention */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">7. Conservación de datos</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Conservaremos sus datos personales mientras mantenga una cuenta activa con nosotros y durante el tiempo necesario para cumplir con las finalidades descritas, así como para cumplir obligaciones legales, fiscales o contractuales. Una vez que usted solicite la eliminación de su cuenta, procederemos a borrar sus datos personales de nuestros sistemas, salvo aquellos que debamos conservar por obligación legal.
          </p>
        </section>

        {/* Section 8: Contact */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">8. Contacto para ejercer derechos</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Para ejercer sus Derechos ARCO, revocar consentimiento o realizar cualquier consulta sobre el tratamiento de sus datos personales, puede contactarnos:
          </p>
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
            <p className="text-sm text-foreground">
              <strong>Correo electrónico:</strong> privacidad@motogo.lat
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              En su solicitud, indique claramente: nombre completo, correo electrónico de su cuenta, descripción clara del derecho que desea ejercer y la información sobre la que recae. Le daremos respuesta en un plazo máximo de 20 días hábiles.
            </p>
          </div>
        </section>

        {/* Section 9: Changes */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">9. Cambios al Aviso de Privacidad</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Nos reservamos el derecho de actualizar este Aviso de Privacidad en cualquier momento. Cualquier modificación será publicada en esta misma página, indicando la fecha de la última actualización. Le recomendamos revisar periódicamente este documento. Si los cambios son sustanciales, le notificaremos a través de la aplicación o por correo electrónico.
          </p>
        </section>

        {/* Section 10: Consent */}
        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">10. Consentimiento</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Al registrarse y utilizar la Plataforma MotoGo, usted manifiesta que ha leído, entendido y aceptado los términos del presente Aviso de Privacidad, y otorga su consentimiento expreso para el tratamiento de sus datos personales conforme a lo aquí descrito.
          </p>
        </section>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Link href="/signup" className="flex-1">
            <Button className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/25">
              Crear una cuenta
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full h-12 text-base font-semibold rounded-xl border-border/50">
              Volver al inicio
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-border/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MotoGo. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
