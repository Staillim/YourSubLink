// === SCRIPT DE DIAGNÓSTICO DE FIREBASE PARA CONSOLA ===
// Ejecutar línea por línea en la consola del navegador

console.log('🔍 === DIAGNÓSTICO DE FIREBASE Y SPONSORS ===');

// Paso 1: Verificar linkId
const linkId = window.location.pathname.split('/').pop();
console.log('🔗 LinkId actual:', linkId);

// Paso 2: Verificar Firebase en contexto global
console.log('🔥 Verificando Firebase...');

// Buscar Firebase en el contexto de la aplicación Next.js
const checkFirebase = () => {
  // Método 1: Buscar en window
  if (window.firebase) {
    console.log('✅ Firebase encontrado en window.firebase');
    return window.firebase;
  }
  
  // Método 2: Buscar en contexto de React (Next.js)
  try {
    const nextData = window.__NEXT_DATA__;
    if (nextData) {
      console.log('✅ Next.js detectado');
    }
  } catch (e) {
    console.log('⚠️ Next.js no detectado en window.__NEXT_DATA__');
  }
  
  // Método 3: Buscar módulos cargados
  if (window.webpackChunkName) {
    console.log('✅ Webpack chunks detectados (app compilada)');
  }
  
  return null;
};

const firebaseInstance = checkFirebase();

// Paso 3: Método manual para query Firebase
console.log('📝 EJECUTA ESTE CÓDIGO MANUALMENTE PARA QUERY FIREBASE:');
console.log(`
// === CÓDIGO PARA EJECUTAR MANUALMENTE ===
// 1. Abre una nueva pestaña en tu aplicación
// 2. Ve a cualquier página que use Firebase (como dashboard)
// 3. En la consola, ejecuta:

const testFirebaseConnection = async () => {
  try {
    // Buscar Firebase en el contexto de la aplicación
    const modules = Object.keys(window).filter(key => key.includes('firebase') || key.includes('fire'));
    console.log('🔍 Módulos relacionados con Firebase:', modules);
    
    // Si Firebase está disponible, hacer query de sponsors
    // (Este código solo funcionará si Firebase está cargado en el contexto)
    
    console.log('💡 Si ves errores de Firebase, ejecuta este código en una página con Firebase activo (como /dashboard)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testFirebaseConnection();
`);

// Paso 4: Verificar estado actual del DOM
console.log('🔍 Verificando estado actual del DOM...');

// Verificar estructura de la página
const bodyClasses = document.body.className;
const htmlClasses = document.documentElement.className;
console.log('📄 Body classes:', bodyClasses);
console.log('📄 HTML classes:', htmlClasses);

// Verificar si es una página de link
const isLinkPage = window.location.pathname.includes('/link/') || window.location.pathname.match(/\/[a-zA-Z0-9]+$/);
console.log('🔗 Es página de link:', isLinkPage);

// Verificar meta tags de la página
const metaTags = Array.from(document.querySelectorAll('meta')).map(meta => ({
  name: meta.name || meta.property,
  content: meta.content
})).filter(meta => meta.name);

console.log('📋 Meta tags relevantes:');
metaTags.slice(0, 5).forEach(tag => {
  console.log(`  ${tag.name}: ${tag.content}`);
});

// Paso 5: Buscar evidencia de carga de sponsors
console.log('🔍 Buscando evidencia de sponsors...');

// Buscar en localStorage/sessionStorage
const localStorageKeys = Object.keys(localStorage).filter(key => 
  key.includes('sponsor') || key.includes('firebase') || key.includes('auth')
);
console.log('💾 LocalStorage keys relevantes:', localStorageKeys);

// Buscar scripts cargados
const scripts = Array.from(document.scripts).map(script => script.src).filter(src => src);
const firebaseScripts = scripts.filter(src => src.includes('firebase') || src.includes('googleapis'));
console.log('📜 Scripts de Firebase cargados:', firebaseScripts.length);

// Paso 6: Instrucciones específicas
console.log(`
🎯 === INSTRUCCIONES ESPECÍFICAS PARA TU CASO ===

PASO 1: Ejecuta este nuevo script mejorado:
await import('/sponsor-diagnosis-console.js')

PASO 2: Si no hay sponsors en DOM, ve a una página con Firebase activo:
- Navega a /dashboard
- En la consola ejecuta:

const querySponsorsManually = async () => {
  const linkId = '${linkId}'; // Tu linkId actual
  
  // Buscar Firebase en el contexto global de la página del dashboard
  const firebase = window.firebase || window.__firebase__ || window._firebase;
  
  if (!firebase) {
    console.log('❌ Firebase no disponible en esta página');
    return;
  }
  
  console.log('✅ Firebase encontrado, haciendo query...');
  // Continuar con query de sponsors
};

PASO 3: Verificar Network tab para requests bloqueados
PASO 4: Reportar resultados aquí
`);

export {};
