export const environment = {
  production: false,
  supabaseUrl: 'https://qvtxhuueazeymxmkydqh.supabase.co',
  supabaseKey: 'sb_publishable_JjioUq8Mf8VbTZ6PfBt9uQ_Dm5yTxqj',
  storage: {
    bucket: 'media',
    folders: {
      users: 'users',
      products: 'products',
    },
    maxFileSizeMb: 7,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  },
};
