// === SCRIPT DE DIAGNÓSTICO DE SPONSORS PARA CONSOLA ===
// Ejecutar en consola: await import('/sponsor-diagnosis-console.js')

console.log('🔍 === DIAGNÓSTICO COMPLETO DE SPONSORS (VERSIÓN CONSOLA) ===');

(async function fullSponsorDiagnosis() {
  try {
    // 1. Verificar si estamos en una página de link
    const currentPath = window.location.pathname;
    console.log('📍 Ruta actual:', currentPath);
    
    // Extraer linkId dependiendo de la estructura de ruta
    let linkId = null;
    if (currentPath.includes('/link/')) {
      linkId = currentPath.split('/link/')[1];
    } else if (currentPath.split('/').length > 1) {
      linkId = currentPath.split('/').pop();
    }
    
    console.log('🔗 LinkId detectado:', linkId);
    
    if (!linkId || linkId === '' || linkId === 'link') {
      console.log('❌ No se detectó un linkId válido en la URL');
      console.log('💡 Asegúrate de estar en una página como /link/abc123 o /abc123');
      return;
    }
    
    // 2. Verificar si Firebase está disponible en el contexto global
    if (typeof window !== 'undefined' && window.firebase) {
      console.log('✅ Firebase detectado en contexto global');
    } else {
      console.log('⚠️ Firebase no detectado en contexto global');
    }
    
    // 3. Verificar elementos DOM relacionados con sponsors
    console.log('🔍 Verificando elementos DOM...');
    
    // Buscar elementos con data-sponsor-id
    const sponsorElements = document.querySelectorAll('[data-sponsor-id]');
    console.log(`📊 Elementos con data-sponsor-id encontrados: ${sponsorElements.length}`);
    
    if (sponsorElements.length > 0) {
      console.log('📋 Sponsors en DOM:');
      sponsorElements.forEach((el, i) => {
        const sponsorId = el.getAttribute('data-sponsor-id');
        const sponsorTitle = el.getAttribute('data-sponsor-title');
        console.log(`  ${i+1}. ID: ${sponsorId}, Título: ${sponsorTitle}`);
      });
    }
    
    // 4. Verificar window.activeSponsors
    if (window.activeSponsors) {
      console.log(`✅ window.activeSponsors existe: ${window.activeSponsors.length} sponsors`);
      window.activeSponsors.forEach((sponsor, i) => {
        console.log(`  ${i+1}. ${sponsor.title} (ID: ${sponsor.id})`);
      });
    } else {
      console.log('❌ window.activeSponsors no existe');
    }
    
    // 5. Buscar componentes de sponsors en el DOM
    const sponsorComponents = document.querySelectorAll('[class*="sponsor"], [id*="sponsor"]');
    console.log(`📊 Elementos relacionados con sponsors: ${sponsorComponents.length}`);
    
    // 6. Verificar si el componente link-gate se renderizó
    const linkGateElements = document.querySelectorAll('[class*="gate"], [id*="gate"]');
    console.log(`📊 Elementos de gate encontrados: ${linkGateElements.length}`);
    
    // 7. Buscar logs de sponsors en consola (si están disponibles)
    console.log('🔍 Busca en la consola estos mensajes:');
    console.log('  - "📋 Sponsors cargados para linkId"');
    console.log('  - "🔧 SponsorRuleItem useEffect ejecutando"');
    console.log('  - "❌ No hay sponsors activos para el link"');
    
    // 8. Manual Firebase check si está disponible
    try {
      // Intentar acceder a Firebase a través del contexto de la aplicación
      const reactFiberKey = Object.keys(document.querySelector('#__next') || {}).find(key => key.startsWith('__reactFiber'));
      if (reactFiberKey) {
        console.log('✅ Aplicación React detectada');
      }
    } catch (e) {
      console.log('⚠️ No se pudo acceder al contexto de React');
    }
    
    // 9. Verificar Network tab para requests de Firebase
    console.log('🌐 VERIFICAR MANUALMENTE EN NETWORK TAB:');
    console.log('  1. Abre DevTools → Network');
    console.log('  2. Filtra por "firestore.googleapis.com"');
    console.log('  3. Recarga la página');
    console.log('  4. Verifica si hay requests bloqueados (rojo)');
    
    // 10. Resumen de diagnóstico
    console.log('\n📋 === RESUMEN DEL DIAGNÓSTICO ===');
    console.log(`🔗 LinkId: ${linkId}`);
    console.log(`📊 Sponsors en DOM: ${sponsorElements.length}`);
    console.log(`🪟 window.activeSponsors: ${window.activeSponsors ? 'Existe' : 'No existe'}`);
    console.log(`🎯 Elements con sponsor: ${sponsorComponents.length}`);
    
    if (sponsorElements.length === 0 && !window.activeSponsors) {
      console.log('\n❌ DIAGNÓSTICO: NO HAY SPONSORS CARGADOS');
      console.log('💡 Posibles causas:');
      console.log('  1. No hay sponsors en la base de datos para este linkId');
      console.log('  2. Firebase está bloqueado por AdBlocker');
      console.log('  3. Error en la carga del componente link-gate');
      console.log('  4. Sponsors existen pero tienen isActive: false');
    } else {
      console.log('\n✅ DIAGNÓSTICO: SPONSORS DETECTADOS EN DOM');
      console.log('💡 Si no funcionan los incrementos, revisar Network tab');
    }
    
  } catch (error) {
    console.error('💥 Error en diagnóstico:', error);
  }
})();

export {}; // Para que sea un módulo válido
