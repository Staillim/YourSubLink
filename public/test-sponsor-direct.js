// Test directo para verificar incremento de sponsors
// Ejecutar desde la consola del navegador cuando veas un sponsor

(async function testSponsorIncrement() {
  console.log('🧪 === INICIANDO TEST DIRECTO DE INCREMENTO DE SPONSORS ===');
  
  try {
    // 1. Verificar que existe window.activeSponsors
    if (!window.activeSponsors || window.activeSponsors.length === 0) {
      console.log('❌ No se encontraron activeSponsors en window');
      console.log('🔍 Buscando sponsors en el DOM...');
      
      // Buscar por data attributes que agregamos
      const sponsorElements = document.querySelectorAll('[data-sponsor-id]');
      if (sponsorElements.length === 0) {
        console.log('❌ No se encontraron sponsors en el DOM');
        console.log('💡 Asegúrate de estar en una página con sponsors activos');
        return;
      }
      
      console.log(`✅ Encontrados ${sponsorElements.length} sponsors en DOM`);
      Array.from(sponsorElements).forEach((el, index) => {
        console.log(`  ${index + 1}. ID: ${el.getAttribute('data-sponsor-id')}, Title: ${el.getAttribute('data-sponsor-title')}`);
      });
      
      const testSponsorId = sponsorElements[0].getAttribute('data-sponsor-id');
      await testIncrement(testSponsorId);
      return;
    }
    
    console.log(`✅ Encontrados ${window.activeSponsors.length} sponsors activos`);
    window.activeSponsors.forEach((sponsor, index) => {
      console.log(`  ${index + 1}. ${sponsor.title} (ID: ${sponsor.id})`);
    });
    
    // Probar con el primer sponsor
    await testIncrement(window.activeSponsors[0].id);
    
  } catch (error) {
    console.error('💥 Error en test principal:', error);
  }
})();

async function testIncrement(sponsorId) {
  console.log(`\n🎯 === TESTING INCREMENTO PARA SPONSOR: ${sponsorId} ===`);
  
  try {
    // Importar Firebase functions
    const { doc, updateDoc, increment, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    // 1. Obtener estado actual
    console.log('📊 Obteniendo estado actual...');
    const sponsorRef = doc(db, 'sponsorRules', sponsorId);
    const beforeDoc = await getDoc(sponsorRef);
    
    if (!beforeDoc.exists()) {
      console.error('❌ El documento del sponsor no existe!');
      return;
    }
    
    const beforeData = beforeDoc.data();
    console.log('� Estado ANTES del incremento:', {
      views: beforeData?.views,
      clicks: beforeData?.clicks,
      title: beforeData?.title,
      isActive: beforeData?.isActive,
      lastUpdate: beforeData?.lastViewUpdate || 'No existe'
    });
    
    // 2. Intentar incremento usando el mismo método que SponsorRuleItem
    console.log('🔄 Ejecutando incremento...');
    await updateDoc(sponsorRef, {
      views: increment(1),
      testDirectIncrement: new Date().toISOString(),
      testSource: 'direct-console-test'
    });
    
    console.log('✅ updateDoc ejecutado sin errores');
    
    // 3. Verificar resultado después de 2 segundos
    setTimeout(async () => {
      try {
        console.log('🔍 Verificando resultado...');
        const afterDoc = await getDoc(sponsorRef);
        const afterData = afterDoc.data();
        
        console.log('📈 Estado DESPUÉS del incremento:', {
          views: afterData?.views,
          clicks: afterData?.clicks,
          testDirectIncrement: afterData?.testDirectIncrement,
          lastViewUpdate: afterData?.lastViewUpdate
        });
        
        const beforeViews = beforeData?.views || 0;
        const afterViews = afterData?.views || 0;
        const success = afterViews > beforeViews;
        
        console.log(`\n${success ? '🎉' : '❌'} RESULTADO: ${success ? 'INCREMENTO EXITOSO!' : 'INCREMENTO FALLÓ'}`);
        console.log(`Views: ${beforeViews} → ${afterViews} (Δ: +${afterViews - beforeViews})`);
        
        if (!success) {
          console.log('\n🔍 POSIBLES CAUSAS DEL FALLO:');
          console.log('1. Reglas de Firestore bloqueando la operación');
          console.log('2. Error de permisos (usuario no autenticado)');
          console.log('3. Problema de red/conectividad');
          console.log('4. Campo views no es de tipo number');
          console.log('5. Document listener conflicts');
          
          console.log('\n🛠️  SUGERENCIAS DE DEBUG:');
          console.log('- Verifica la consola de red para errores HTTP');
          console.log('- Revisa las reglas de Firestore');
          console.log('- Confirma que el usuario está autenticado');
          console.log('- Ejecuta: await import("@/lib/firebase").then(m => console.log("DB:", m.db))');
        } else {
          console.log('\n🎉 ¡EL SISTEMA DE INCREMENTO FUNCIONA CORRECTAMENTE!');
          console.log('El problema podría estar en:');
          console.log('- SponsorRuleItem no se está renderizando');
          console.log('- useEffect no se está ejecutando');
          console.log('- handleView tiene algún error silencioso');
        }
        
      } catch (verifyError) {
        console.error('❌ Error verificando resultado:', verifyError);
      }
    }, 2000);
    
  } catch (error) {
    console.error('💥 Error en incremento:', error);
    console.log('🔍 Detalles del error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}
