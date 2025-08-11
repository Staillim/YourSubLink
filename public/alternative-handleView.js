// Versión alternativa del método handleView usando updateDoc en lugar de writeBatch
// Probar esta versión para ver si el problema está en writeBatch

const handleViewAlternative = async () => {
  try {
    // Validar que el sponsor tiene ID
    if (!sponsor.id) {
      console.error('Error: sponsor.id is missing', sponsor);
      return;
    }

    console.log(`🔄 Incrementando view para sponsor: ${sponsor.title} (ID: ${sponsor.id})`);

    // Método alternativo: usar updateDoc directamente en lugar de writeBatch
    const { updateDoc } = await import('firebase/firestore');
    const sponsorRef = doc(db, 'sponsorRules', sponsor.id);
    
    await updateDoc(sponsorRef, { 
      views: increment(1),
      lastViewUpdate: new Date().toISOString() // Para verificar que la actualización ocurrió
    });
    
    console.log(`✅ View incrementada exitosamente para sponsor: ${sponsor.title} (ID: ${sponsor.id})`);
    onView(sponsor);
  } catch (error) {
    console.error('❌ Error registering sponsor view:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
};
