const SUPABASE_URL = 'https://xjaimwuntykafkadpbdr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYWltd3VudHlrYWZrYWRwYmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyODc3MDcsImV4cCI6MjEwMDg2MzcwN30.ATNP7Yijw-GTsznjhMNlR_uogiE7y27l8w4vJnB_iAg';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CONFIG = {
    porcentajeCritico: 20,
    diasVencimiento: 30,
    appName: 'Bodega UChile',
    version: '3.3.0'
};
