// === TEST DE INCREMENTO MANUAL DE SPONSORS ===
// Ejecutar en consola: await import('/test-sponsor-increment-manual.js')

console.log('🧪 === TEST DE INCREMENTO MANUAL DE SPONSORS ===');

(async function testSponsorIncrement() {
  try {
    // 1. Verificar que hay sponsors cargados
    if (!window.activeSponsors || window.activeSponsors.length === 0) {
      console.log('❌ No hay sponsors activos en window.activeSponsors');
      console.log('💡 Recarga la página y asegúrate de estar en un link con sponsors');
      return;
    }

    console.log(`✅ Encontrados ${window.activeSponsors.length} sponsors activos`);
    
    // 2. Seleccionar el primer sponsor para prueba
    const testSponsor = window.activeSponsors[0];
    console.log(`🎯 Testeando sponsor: ${testSponsor.title} (ID: ${testSponsor.id})`);
    
    // 3. Importar Firebase (usar el contexto global de la aplicación)
    const firebase = await import('firebase/firestore');
    const { doc, updateDoc, increment, getDoc } = firebase;
    
    // 4. Buscar la instancia de db en el contexto global
    let db;
    if (window.__FIREBASE_DB__) {
      db = window.__FIREBASE_DB__;
    } else {
      // Intentar importar desde el módulo
      try {
        const firebaseModule = await import('@/lib/firebase');
        db = firebaseModule.db;
      } catch (e) {
        console.log('❌ No se pudo acceder a la instancia de Firebase');
        console.log('💡 Este test debe ejecutarse en el contexto de la aplicación');
        return;
      }
    }
    
    console.log('✅ Firebase db obtenida');
    
    // 5. Leer valor actual
    const sponsorRef = doc(db, 'sponsorRules', testSponsor.id);
    const currentDoc = await getDoc(sponsorRef);
    
    if (!currentDoc.exists()) {
      console.log('❌ El documento del sponsor no existe en Firestore');
      return;
    }
    
    const currentData = currentDoc.data();
    const currentViews = currentData.views || 0;
    console.log(`📊 Views actuales: ${currentViews}`);
    
    // 6. Ejecutar incremento
    console.log('🚀 Ejecutando incremento manual...');
    
    await updateDoc(sponsorRef, {
      views: increment(1),
      lastViewUpdate: new Date().toISOString(),
      testIncrement: true // Marcador para identificar este test
    });
    
    // 7. Verificar resultado
    const updatedDoc = await getDoc(sponsorRef);
    const updatedData = updatedDoc.data();
    const newViews = updatedData.views || 0;
    
    console.log(`📊 Views después del incremento: ${newViews}`);
    console.log(`📊 Diferencia: +${newViews - currentViews}`);
    
    if (newViews > currentViews) {
      console.log('✅ ¡INCREMENTO EXITOSO! El sistema de Firebase funciona correctamente');
      console.log('💡 El problema puede estar en el useEffect del SponsorRuleItem');
    } else {
      console.log('❌ El incremento no funcionó');
      console.log('💡 Verificar permisos de Firestore y reglas de seguridad');
    }
    
    // 8. Información adicional
    console.log('🔍 Información adicional:');
    console.log('  - lastViewUpdate:', updatedData.lastViewUpdate);
    console.log('  - testIncrement:', updatedData.testIncrement);
    
  } catch (error) {
    console.error('💥 Error en test manual:', error);
    
    // Ayuda específica según el tipo de error
    if (error.code === 'permission-denied') {
      console.log('🔒 Error de permisos: Verifica las reglas de Firestore');
    } else if (error.code === 'unavailable') {
      console.log('🌐 Error de conectividad: Verifica conexión a internet');
    } else if (error.message.includes('Failed to resolve module')) {
      console.log('📦 Error de módulos: Ejecuta este script en el contexto de la aplicación Next.js');
    }
  }
})();

export {};
