'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Database, CheckCircle, AlertTriangle } from 'lucide-react';

export function SponsorStatsMigrator() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    checked: number;
    updated: number;
    errors: string[];
  } | null>(null);

  const migrateSponsorStats = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      console.log('🔍 Iniciando migración de estadísticas de sponsors...');
      
      const sponsorsSnapshot = await getDocs(collection(db, 'sponsorRules'));
      const batch = writeBatch(db);
      let updatedCount = 0;
      const errors: string[] = [];

      console.log(`📋 Revisando ${sponsorsSnapshot.docs.length} sponsors...`);

      sponsorsSnapshot.docs.forEach(docSnap => {
        try {
          const data = docSnap.data();
          
          // Verificar si faltan los campos views o clicks
          const needsViews = typeof data.views !== 'number';
          const needsClicks = typeof data.clicks !== 'number';
          
          if (needsViews || needsClicks) {
            const updates: any = {};
            
            if (needsViews) {
              updates.views = 0;
              console.log(`📊 Inicializando views=0 para sponsor: ${data.title || docSnap.id}`);
            }
            
            if (needsClicks) {
              updates.clicks = 0;
              console.log(`🖱️  Inicializando clicks=0 para sponsor: ${data.title || docSnap.id}`);
            }
            
            batch.update(doc(db, 'sponsorRules', docSnap.id), updates);
            updatedCount++;
          } else {
            console.log(`✅ Sponsor OK: ${data.title || docSnap.id} (views: ${data.views}, clicks: ${data.clicks})`);
          }
        } catch (error) {
          const errorMsg = `Error procesando sponsor ${docSnap.id}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
        console.log(`✅ Migración completada: ${updatedCount} sponsors actualizados`);
      } else {
        console.log('✅ No se encontraron sponsors que requieran migración');
      }

      setResults({
        checked: sponsorsSnapshot.docs.length,
        updated: updatedCount,
        errors
      });

    } catch (error) {
      console.error('❌ Error durante la migración:', error);
      setResults({
        checked: 0,
        updated: 0,
        errors: [`Error general: ${error}`]
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Database className="h-8 w-8 mx-auto text-blue-600 mb-2" />
        <CardTitle>Migrador de Estadísticas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Inicializa campos views/clicks en sponsors existentes
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={migrateSponsorStats}
          disabled={isRunning}
          className="w-full"
          variant={results?.updated === 0 ? "outline" : "default"}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Migrando...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Ejecutar Migración
            </>
          )}
        </Button>

        {results && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Sponsors revisados: {results.checked}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-blue-600" />
              <span>Sponsors actualizados: {results.updated}</span>
            </div>
            {results.errors.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Errores: {results.errors.length}</span>
                </div>
                <div className="text-xs text-red-500 max-h-20 overflow-y-auto">
                  {results.errors.map((error, i) => (
                    <div key={i}>• {error}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>¿Qué hace?</strong></p>
          <p>• Busca sponsors sin campos views/clicks</p>
          <p>• Inicializa ambos campos en 0</p>
          <p>• Permite mostrar estadísticas correctas</p>
        </div>
      </CardContent>
    </Card>
  );
}
