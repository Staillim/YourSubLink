// Diagnóstico: Verificar estructura de datos de sponsors
// Para ejecutar desde la consola del navegador

(async function checkSponsorDataStructure() {
  console.log('🔍 Verificando estructura de datos de sponsors...');
  
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    const sponsorsSnapshot = await getDocs(collection(db, 'sponsorRules'));
    
    console.log(`📋 Total de sponsors encontrados: ${sponsorsSnapshot.docs.length}`);
    
    sponsorsSnapshot.docs.forEach((docSnap, index) => {
      const data = docSnap.data();
      
      console.log(`\n📄 Sponsor ${index + 1} (${docSnap.id}):`);
      console.log('  - title:', data.title);
      console.log('  - views:', data.views, '(type:', typeof data.views, ')');
      console.log('  - clicks:', data.clicks, '(type:', typeof data.clicks, ')');
      console.log('  - isActive:', data.isActive);
      console.log('  - linkId:', data.linkId);
      console.log('  - sponsorUrl:', data.sponsorUrl);
      
      // Verificar si los campos existen
      const hasViews = 'views' in data;
      const hasClicks = 'clicks' in data;
      
      console.log('  - hasViewsField:', hasViews);
      console.log('  - hasClicksField:', hasClicks);
      
      if (!hasViews || !hasClicks) {
        console.warn('  ⚠️  PROBLEMA: Faltan campos views o clicks');
      }
      
      if (typeof data.views !== 'number' || typeof data.clicks !== 'number') {
        console.warn('  ⚠️  PROBLEMA: views o clicks no son números');
      }
    });
    
    // Verificar reglas de Firestore
    console.log('\n🔒 Verificando que las reglas permitan updates públicos...');
    console.log('Las reglas deben permitir: request.resource.data.diff(resource.data).affectedKeys().hasOnly([\'views\', \'clicks\'])');
    
  } catch (error) {
    console.error('💥 Error verificando estructura:', error);
  }
})();
