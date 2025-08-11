import { SponsorStatsMigrator } from '@/components/sponsor-stats-migrator';
import SponsorTrackerTester from '@/components/sponsor-tracker-tester';

export default function SponsorTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">🧪 Herramientas de Debug - Sponsors</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Migrador de Estadísticas</h2>
          <p className="text-gray-600 mb-4">
            Inicializa los campos views y clicks en sponsors existentes.
          </p>
          <SponsorStatsMigrator />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Tester de Tracking</h2>
          <p className="text-gray-600 mb-4">
            Prueba el sistema de incremento de estadísticas en tiempo real.
          </p>
          <SponsorTrackerTester />
        </section>
      </div>
    </div>
  );
}
