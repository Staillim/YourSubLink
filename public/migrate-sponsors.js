// Helper function para migrar sponsors desde la consola del navegador
// Ejecutar en la consola: migrateSponsorStats()

async function migrateSponsorStats() {
  const { collection, getDocs, writeBatch, doc } = await import('firebase/firestore');
  const { db } = await import('/lib/firebase.js');
  
  try {
    console.log('🔍 Buscando sponsors sin estadísticas inicializadas...');
    
    const sponsorsSnapshot = await getDocs(collection(db, 'sponsorRules'));
    const batch = writeBatch(db);
    let updatedCount = 0;

    sponsorsSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      
      // Verificar si faltan los campos views o clicks
      const needsViews = typeof data.views !== 'number';
      const needsClicks = typeof data.clicks !== 'number';
      
      if (needsViews || needsClicks) {
        const updates = {};
        
        if (needsViews) {
          updates.views = 0;
          console.log(`📊 Inicializando views para sponsor: ${data.title || docSnap.id}`);
        }
        
        if (needsClicks) {
          updates.clicks = 0;
          console.log(`🖱️  Inicializando clicks para sponsor: ${data.title || docSnap.id}`);
        }
        
        batch.update(doc(db, 'sponsorRules', docSnap.id), updates);
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ Migración completada: ${updatedCount} sponsors actualizados`);
    } else {
      console.log('✅ No se encontraron sponsors que requieran migración');
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
}

// Hacer la función disponible globalmente
window.migrateSponsorStats = migrateSponsorStats;

console.log('🔧 Función migrateSponsorStats() disponible. Ejecutar: migrateSponsorStats()');
