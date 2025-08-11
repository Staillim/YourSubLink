// Script de diagnóstico para revisar sponsors y sus estadísticas
// Ejecutar en la consola del navegador

async function diagnosticSponsors() {
  const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
  const { db } = await import('/lib/firebase.js');
  
  try {
    console.log('🔍 Diagnósticando sponsors...');
    
    const sponsorsQuery = query(
      collection(db, 'sponsorRules'),
      orderBy('createdAt', 'desc')
    );
    
    const sponsorsSnapshot = await getDocs(sponsorsQuery);
    
    console.log(`📊 Total de sponsors encontrados: ${sponsorsSnapshot.docs.length}`);
    
    let needsViews = 0;
    let needsClicks = 0;
    let withStats = 0;
    
    sponsorsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const hasViews = typeof data.views === 'number';
      const hasClicks = typeof data.clicks === 'number';
      
      if (!hasViews) needsViews++;
      if (!hasClicks) needsClicks++;
      if (hasViews && hasClicks) withStats++;
      
      console.log(`${index + 1}. ${data.title || 'Sin título'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Views: ${hasViews ? data.views : '❌ FALTA'}`);
      console.log(`   Clicks: ${hasClicks ? data.clicks : '❌ FALTA'}`);
      console.log(`   Link: ${data.linkId}`);
      console.log(`   Activo: ${data.isActive ? '✅' : '❌'}`);
      console.log('---');
    });
    
    console.log('\n📈 RESUMEN:');
    console.log(`✅ Sponsors con estadísticas completas: ${withStats}`);
    console.log(`❌ Sponsors sin campo views: ${needsViews}`);
    console.log(`❌ Sponsors sin campo clicks: ${needsClicks}`);
    
    if (needsViews > 0 || needsClicks > 0) {
      console.log('\n🔧 Ejecuta migrateSponsorStats() para corregir esto');
    } else {
      console.log('\n✅ Todos los sponsors tienen estadísticas inicializadas');
    }
    
  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Hacer la función disponible globalmente
window.diagnosticSponsors = diagnosticSponsors;

console.log('🔧 Función diagnosticSponsors() disponible. Ejecutar: diagnosticSponsors()');
