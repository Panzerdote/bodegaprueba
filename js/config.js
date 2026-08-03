const SUPABASE_URL = 'https://xjaimwuntykafkadpbdr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYWltd3VudHlrYWZrYWRwYmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyODc3MDcsImV4cCI6MjEwMDg2MzcwN30.ATNP7Yijw-GTsznjhMNlR_uogiE7y27l8w4vJnB_iAg';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CONFIG = {
    porcentajeCritico: 20,
    diasVencimiento: 30,
    appName: 'Bodega CEHAQ',
    version: '5.0.0',
    pageSize: 50
};

// Función global para verificar autenticación
function checkAuth() {
    const userData = localStorage.getItem('cehaq_user');
    const bodega = localStorage.getItem('cehaq_bodega');
    if (!userData || !bodega) { 
        window.location.href = 'login.html'; 
        return null; 
    }
    const user = JSON.parse(userData);
    if (!user.activo) { 
        window.location.href = 'login.html'; 
        return null; 
    }
    window.currentUser = user;
    window.currentBodega = bodega;
    return { user, bodega };
}

function cambiarBodega() { window.location.href = 'seleccionar.html'; }

async function cerrarSesion() { 
    localStorage.removeItem('cehaq_user'); 
    localStorage.removeItem('cehaq_bodega'); 
    window.location.href = 'login.html'; 
}

// Función para limpiar códigos de barras (usada en múltiples módulos)
function limpiarCodigoBarras(codigo) {
    if (!codigo) return '';
    const match = codigo.match(/\(01\)(\d+)/);
    return match ? match[1] : codigo.replace(/[()\s-]/g, '').toUpperCase();
}

// Función para escapar HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/js/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registrado:', registration.scope);
            })
            .catch((error) => {
                console.error('Error al registrar Service Worker:', error);
            });
    });
}
