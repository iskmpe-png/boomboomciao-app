// Boom Boom Ciao · configuración de este entorno.
// Este es el único archivo que cambia entre la app real y la de pruebas.
window.BBC_SUPABASE = {
  entorno: 'produccion',            // 'produccion' o 'pruebas'
  url: 'https://qgjsqwkkrgtrfpxschmn.supabase.co',
  key: 'sb_publishable_VYGjBgN7J3fJVMSq1Mp1ZA_93REskD6',
  // Datos de la empresa: salen en Privacidad, Términos y Aviso legal (también antes de entrar).
  // Mientras estén vacíos, esos textos los marcan en amarillo como pendientes.
  legal: {
    responsable: '',                // razón social exacta, por ejemplo: Restaurantes Ejemplo S.L.
    cif: '',                        // NIF/CIF de la empresa
    direccion: '',                  // domicilio social completo
    email: '',                      // correo para privacidad y reclamaciones (por ejemplo privacidad@…)
    telefono: '',                   // opcional
    registro: '',                   // opcional: «Registro Mercantil de Madrid, tomo…, folio…, hoja…»
    region: 'la Unión Europea (Irlanda)' // dónde está el proyecto de Supabase (eu-west-1 = Irlanda)
  },
  // Captcha contra robots al crear cuenta (Cloudflare Turnstile, gratis). Déjalo vacío para no usarlo.
  // Si lo pones, guarda también el secreto TURNSTILE_SECRET en la función «cuentas» de Supabase.
  turnstile: '0x4AAAAAAGRvA04NYJQ7xkLW'
};
