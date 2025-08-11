'use client';

import { useState } from 'react';
import { collection, getDocs, doc, writeBatch, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SponsorTestResult {
  id: string;
  title?: string;
  beforeViews: number;
  beforeClicks: number;
  afterViews?: number;
  afterClicks?: number;
  incrementSuccess: boolean;
  error?: string;
}

export default function SponsorTrackerTester() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SponsorTestResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev, logMessage]);
  };

  const testSponsorTracking = async () => {
    setIsRunning(true);
    setResults([]);
    setLogs([]);

    addLog('🧪 Iniciando test de tracking de sponsors...');

    try {
      // 1. Obtener todos los sponsors
      const sponsorsSnapshot = await getDocs(collection(db, 'sponsorRules'));
      addLog(`📋 Encontrados ${sponsorsSnapshot.docs.length} sponsors para probar`);

      if (sponsorsSnapshot.docs.length === 0) {
        addLog('❌ No se encontraron sponsors para probar');
        setIsRunning(false);
        return;
      }

      const testResults: SponsorTestResult[] = [];

      // 2. Probar con el primer sponsor (o uno específico)
      const testDoc = sponsorsSnapshot.docs[0];
      const sponsorData = testDoc.data();
      
      addLog(`🎯 Probando con sponsor: ${sponsorData.title || testDoc.id}`);
      
      const beforeViews = sponsorData.views || 0;
      const beforeClicks = sponsorData.clicks || 0;
      
      addLog(`📊 Estado inicial - Views: ${beforeViews}, Clicks: ${beforeClicks}`);

      const testResult: SponsorTestResult = {
        id: testDoc.id,
        title: sponsorData.title,
        beforeViews,
        beforeClicks,
        incrementSuccess: false
      };

      try {
        // 3. Intentar incrementar views
        addLog('🔄 Intentando incrementar views...');
        const batch = writeBatch(db);
        const sponsorRef = doc(db, 'sponsorRules', testDoc.id);
        
        batch.update(sponsorRef, {
          views: increment(1)
        });
        
        await batch.commit();
        addLog('✅ Batch commit exitoso para views');
        
        // 4. Esperar un momento y verificar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 5. Leer el documento actualizado
        const updatedSnapshot = await getDocs(collection(db, 'sponsorRules'));
        const updatedDoc = updatedSnapshot.docs.find(d => d.id === testDoc.id);
        
        if (updatedDoc) {
          const updatedData = updatedDoc.data();
          testResult.afterViews = updatedData.views || 0;
          testResult.afterClicks = updatedData.clicks || 0;
          
          const viewsIncremented = (testResult.afterViews !== undefined && testResult.afterViews > beforeViews);
          testResult.incrementSuccess = viewsIncremented;
          
          addLog(`📈 Estado después - Views: ${testResult.afterViews ?? 'undefined'}, Clicks: ${testResult.afterClicks ?? 'undefined'}`);
          addLog(`${viewsIncremented ? '✅' : '❌'} Incremento ${viewsIncremented ? 'exitoso' : 'falló'}`);
          
          if (viewsIncremented) {
            addLog(`🎉 ¡Incremento funcionó! Views aumentaron de ${beforeViews} a ${testResult.afterViews}`);
          } else {
            addLog(`⚠️  Incremento no detectado. Valores permanecen iguales.`);
          }
        }
        
      } catch (error) {
        testResult.error = error instanceof Error ? error.message : String(error);
        addLog(`❌ Error durante incremento: ${testResult.error}`);
      }

      testResults.push(testResult);
      setResults(testResults);

      // 6. Test adicional: Intentar incrementar clicks
      try {
        addLog('🔄 Probando incremento de clicks...');
        const batch2 = writeBatch(db);
        const sponsorRef = doc(db, 'sponsorRules', testDoc.id);
        
        batch2.update(sponsorRef, {
          clicks: increment(1)
        });
        
        await batch2.commit();
        addLog('✅ Batch commit exitoso para clicks');
        
      } catch (error) {
        addLog(`❌ Error incrementando clicks: ${error}`);
      }

    } catch (error) {
      addLog(`💥 Error general: ${error}`);
    } finally {
      setIsRunning(false);
      addLog('🏁 Test completado');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Tester de Tracking de Sponsors</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testSponsorTracking} 
            disabled={isRunning}
            className="mb-4"
          >
            {isRunning ? '⏳ Ejecutando test...' : '🚀 Ejecutar Test de Tracking'}
          </Button>

          {logs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">📝 Logs:</h3>
              <div className="bg-gray-100 p-4 rounded-lg max-h-60 overflow-y-auto font-mono text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">📊 Resultados:</h3>
              {results.map((result, index) => (
                <Card key={index} className="mb-4">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p><strong>Sponsor:</strong> {result.title || result.id}</p>
                        <p><strong>Estado:</strong> 
                          <span className={result.incrementSuccess ? 'text-green-600' : 'text-red-600'}>
                            {result.incrementSuccess ? ' ✅ Funcionando' : ' ❌ No funciona'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p><strong>Views:</strong> {result.beforeViews} → {result.afterViews ?? '?'}</p>
                        <p><strong>Clicks:</strong> {result.beforeClicks} → {result.afterClicks ?? '?'}</p>
                        {result.error && (
                          <p className="text-red-600"><strong>Error:</strong> {result.error}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
