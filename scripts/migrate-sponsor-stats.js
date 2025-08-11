// Script para migrar sponsors existentes que no tengan campos views/clicks
// Ejecutar con: node scripts/migrate-sponsor-stats.js

const admin = require('firebase-admin');

// Inicializar Firebase Admin (asegúrate de tener las credenciales configuradas)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Reemplaza con tu project ID
    projectId: 'your-project-id'
  });
}

const db = admin.firestore();

async function migrateSponsorStats() {
  try {
    console.log('🔍 Buscando sponsors sin estadísticas inicializadas...');
    
    const sponsorsSnapshot = await db.collection('sponsorRules').get();
    const batch = db.batch();
    let updatedCount = 0;

    sponsorsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Verificar si faltan los campos views o clicks
      const needsViews = typeof data.views !== 'number';
      const needsClicks = typeof data.clicks !== 'number';
      
      if (needsViews || needsClicks) {
        const updates = {};
        
        if (needsViews) {
          updates.views = 0;
          console.log(`📊 Inicializando views para sponsor: ${data.title || doc.id}`);
        }
        
        if (needsClicks) {
          updates.clicks = 0;
          console.log(`🖱️  Inicializando clicks para sponsor: ${data.title || doc.id}`);
        }
        
        batch.update(doc.ref, updates);
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

// Ejecutar migración
migrateSponsorStats()
  .then(() => {
    console.log('🏁 Script de migración finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
