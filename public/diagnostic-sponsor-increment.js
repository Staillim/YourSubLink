// Script de diagnóstico para probar incrementos directos
// Ejecutar desde la consola del navegador

(async function diagnosticSponsorIncrement() {
  console.log('🧪 Iniciando diagnóstico de incremento de sponsors...');
  
  try {
    // 1. Importar Firebase
    const { collection, getDocs, doc, writeBatch, increment, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    console.log('✅ Firebase importado correctamente');
    
    // 2. Obtener un sponsor para probar
    const sponsorsSnapshot = await getDocs(collection(db, 'sponsorRules'));
    
    if (sponsorsSnapshot.docs.length === 0) {
      console.error('❌ No se encontraron sponsors en la base de datos');
      return;
    }
    
    const testSponsor = sponsorsSnapshot.docs[0];
    const sponsorData = testSponsor.data();
    
    console.log('🎯 Sponsor para prueba:', {
      id: testSponsor.id,
      title: sponsorData.title,
      currentViews: sponsorData.views,
      currentClicks: sponsorData.clicks
    });
    
    // 3. Verificar el tipo de datos actual
    console.log('🔍 Tipos de datos actuales:', {
      viewsType: typeof sponsorData.views,
      clicksType: typeof sponsorData.clicks,
      viewsValue: sponsorData.views,
      clicksValue: sponsorData.clicks
    });
    
    // 4. Intentar incremento directo de views
    console.log('🔄 Probando incremento directo...');
    
    const sponsorRef = doc(db, 'sponsorRules', testSponsor.id);
    const batch = writeBatch(db);
    
    // Probar incremento de views
    batch.update(sponsorRef, { 
      views: increment(1),
      lastTestUpdate: new Date().toISOString()
    });
    
    await batch.commit();
    console.log('✅ Batch commit ejecutado');
    
    // 5. Verificar el resultado
    setTimeout(async () => {
      try {
        const updatedDoc = await getDoc(sponsorRef);
        const updatedData = updatedDoc.data();
        
        console.log('📊 Resultado después del incremento:', {
          id: testSponsor.id,
          beforeViews: sponsorData.views,
          afterViews: updatedData?.views,
          incrementSuccess: (updatedData?.views || 0) > (sponsorData.views || 0),
          lastTestUpdate: updatedData?.lastTestUpdate
        });
        
        if ((updatedData?.views || 0) > (sponsorData.views || 0)) {
          console.log('🎉 ¡INCREMENTO EXITOSO! El problema no está en Firebase');
        } else {
          console.log('❌ INCREMENTO FALLÓ - Problema en Firebase o reglas de seguridad');
        }
        
      } catch (readError) {
        console.error('❌ Error leyendo documento actualizado:', readError);
      }
    }, 2000);
    
  } catch (error) {
    console.error('💥 Error en diagnóstico:', error);
  }
})();
