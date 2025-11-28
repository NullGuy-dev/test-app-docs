require('dotenv').config();
const fs = require('fs');
const path = require('path');

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { platform } = require('os');

const refreshLocks = {};

async function getGlobalInstagramFacebookToken() {
  try {
    const row = await prisma.InstagramFacebookToken.findFirst();
    return row ? row.token : null;
  } catch (err) {
    console.error('Error fetching global token:', err.message);
    return null;
  }
}

async function setGlobalInstagramFacebookToken(token) {
  try {
    return await prisma.InstagramFacebookToken.upsert({
      where: { id: 1 }, // Предположим, что у вас всегда один глобальный токен
      update: { token },
      create: { token }
    });
  } catch (err) {
    console.error('Error setting global token:', err.message);
    throw err;
  }
}

async function refreshBrandToken(brand, provider = 'instagram') {
  const credsKey = provider === 'facebook' ? 'facebookCredentials' : 'instagramCredentials';
  const credsRaw = brand[credsKey];
  if (!credsRaw) return null;

  const creds = { ...credsRaw };
  const appId = creds.app_id || creds.appId || creds.client_id || creds.clientId;
  const appSecret = creds.app_secret || creds.appSecret || creds.client_secret || creds.clientSecret;

  if (!appId || !appSecret) {
    console.warn(`${provider} credentials incomplete for brand`, brand.id);
    return creds;
  }

  const lockKey = `${brand.id}_${provider}`;
  if (refreshLocks[lockKey]) {
    await refreshLocks[lockKey];
    const globalTokenAfter = await getGlobalInstagramFacebookToken();
    if (globalTokenAfter) creds.access_token = globalTokenAfter;
    return creds;
  }

  let resolveLock;
  refreshLocks[lockKey] = new Promise(res => { resolveLock = res; });

  try {
    const globalToken = await getGlobalInstagramFacebookToken();
    if (!globalToken) {
      console.warn('No global token for brand', brand.id, provider);
      return creds;
    }

    const url = 'https://graph.facebook.com/v24.0/oauth/access_token';
    const r = await axios.get(url, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: globalToken,
      },
      paramsSerializer: p => new URLSearchParams(p).toString(),
      timeout: 10000
    });

    const data = r.data;
    if (data.access_token) {
      await setGlobalInstagramFacebookToken(data.access_token);
      console.log(`✅ Global token updated from FB response for brand ${brand.id} provider=${provider}`);
      creds.access_token = data.access_token;
      if (data.expires_in) {
        creds.expires_at = new Date(Date.now() + Number(data.expires_in) * 1000).toISOString();
      }
    } else {
      console.warn('⚠️ No access_token in FB response:', data);
    }

    return creds;
  } catch (err) {
    console.error(`❌ Error refreshing ${provider} token for brand ${brand.id}:`, err.message);
    const curToken = await getGlobalInstagramFacebookToken();
    if (curToken) creds.access_token = curToken;
    return creds;
  } finally {

    resolveLock();
    delete refreshLocks[lockKey];
  }
}

const prisma = new PrismaClient();

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const upload = multer({ dest: UPLOAD_DIR });

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

function ensureAuth(req, res, next) {
  if (req.session.user) return next();
  req.flash('error','Please login');
  res.redirect('/login');
}

app.get('/', ensureAuth, async (req,res)=>{
  const brands = await prisma.brand.findMany({ orderBy: { id: 'desc' }});
  res.render('index', { user: req.session.user, brands, messages: req.flash() });
});

app.get('/register', (req,res)=> res.render('register', { user: req.session.user, messages: req.flash() }));
app.post('/register', async (req,res)=>{
  const { email, password, name } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    await prisma.user.create({ data: { email, passwordHash: hash, name }});
    req.flash('success','Registered. Please login.');
    res.redirect('/login');
  } catch(e){
    console.error(e);
    req.flash('error','Registration failed: ' + e.message);
    res.redirect('/register');
  }
});

app.get('/login', (req,res)=> res.render('login', { user: req.session.user, messages: req.flash() }));
app.post('/login', async (req,res)=>{
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email }});
  if (!user) { req.flash('error','Invalid credentials'); return res.redirect('/login'); }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) { req.flash('error','Invalid credentials'); return res.redirect('/login'); }
  req.session.user = { id: user.id, email: user.email, name: user.name };
  res.redirect('/');
});

app.get('/logout', (req,res)=>{
  req.session.destroy(()=> res.redirect('/login'));
});

app.get('/brands/new', ensureAuth, (req,res)=> res.render('brand_new', { user: req.session.user, messages: req.flash() }));
app.post("/brands/new", ensureAuth, upload.none(), async (req, res) => {
  try {
    const data = req.body;

    const parseJsonSafe = (value) => {
      if (!value || !value.trim()) return null;
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error("Invalid JSON:", value);
        throw new Error("Invalid JSON in credentials");
      }
    };

    const parseLangs = (value) => {
      if (!value) return [];
      return value.split(",").map(s => s.trim()).filter(Boolean);
    };

    let instagramCreds = undefined;
    if (data.instagram_credentials) {
      instagramCreds = parseJsonSafe(data.instagram_credentials);
      if (instagramCreds && instagramCreds.access_token) {
        try {
          await setGlobalInstagramFacebookToken(instagramCreds.access_token);
          console.log('🌐 Saved global Instagram token from brand creation');
        } catch (err) {
          console.error('Failed to save global Instagram token:', err);
        }
        delete instagramCreds.access_token;
      }
    }

    let facebookCreds = undefined;
    if (data.facebook_credentials) {
      facebookCreds = parseJsonSafe(data.facebook_credentials);
      if (facebookCreds && facebookCreds.access_token) {
        try {
          await setGlobalInstagramFacebookToken(facebookCreds.access_token);
          console.log('🌐 Saved global Instagram/Facebook token from brand creation');
        } catch (err) {
          console.error('Failed to save global Instagram/Facebook token:', err);
        }
        delete facebookCreds.access_token;
      }
    }

    if (data.instagramFacebook_global_token && data.instagramFacebook_global_token.trim()) {
      try {
        await setGlobalInstagramFacebookToken(data.instagramFacebook_global_token.trim());
        console.log('🌐 Saved global Instagram token from separate field');
      } catch (err) {
        console.error('Failed to save global Instagram token (field):', err);
      }
    }

    const brandData = {
      name: data.name,
      description: data.description || null,
    
      telegramChannel: data.telegram_channel || null,
      telegramLanguages: parseLangs(data.telegram_languages),
    
      wordpressCredentials: data.wordpress_credentials ? JSON.parse(data.wordpress_credentials) : undefined,
      wordpressLanguages: parseLangs(data.wordpress_languages),
    
      linkedinCredentials: data.linkedin_credentials ? JSON.parse(data.linkedin_credentials) : undefined,
      linkedinLanguages: parseLangs(data.linkedin_languages),
    
      tiktokCredentials: data.tiktok_credentials || null,
      tiktokLanguages: parseLangs(data.tiktok_languages),

      instagramCredentials: instagramCreds ? instagramCreds : undefined,
      instagramLanguages: parseLangs(data.instagram_languages),

      facebookCredentials: facebookCreds ? facebookCreds : undefined,
      facebookLanguages: parseLangs(data.facebook_languages),
    };

    await prisma.brand.create({ data: brandData });

    req.flash("success", "Brand created");
    res.redirect("/");
  } catch (e) {
    console.error(e);
    req.flash("error", "Failed to create brand: " + e.message);
    res.redirect("/brands/new");
  }
});

app.post('/brands/:id/documents', ensureAuth, upload.single('document'), async (req,res)=>{
  const brandId = parseInt(req.params.id);
  const file = req.file;
  if (!file) { req.flash('error','No file'); return res.redirect('/brands/'+brandId); }

  const brand = await prisma.brand.findUnique({ where: { id: brandId }});
  if (!brand) { req.flash('error','Brand not found'); return res.redirect('/'); }

  await prisma.brandDocument.create({
    data: {
      brandId,
      filename: file.filename,
      originalName: file.originalname,
      mime: file.mimetype
    }
  });

  const FormData = require('form-data');
  const ragForm = new FormData();
  const docPath = path.join(UPLOAD_DIR, file.filename);
  ragForm.append('rag_docs[]', fs.createReadStream(docPath), { filename: file.originalname });
  ragForm.append('brandId', brandId);

  try {
    await axios.post(
      process.env.N8N_UPLOAD_RAG_URL,
      ragForm,
      { headers: ragForm.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity }
    );
    console.log(`✅ Документ ${file.originalname} отправлен в RAG для бренда ${brand.name}`);
  } catch (e) {
    console.error('❌ Ошибка отправки документа в RAG:', e.message);
  }

  req.flash('success','Document uploaded');
  res.redirect('/brands/'+brandId);
});

app.post('/brands/:id/documents/deleteAll', ensureAuth, async (req, res) => {
  const brandId = Number(req.params.id);

  try {
    const docs = await prisma.brandDocument.findMany({ where: { brandId } });

    docs.forEach(d => {
      const filePath = path.join(__dirname, 'uploads', d.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    await prisma.brandDocument.deleteMany({ where: { brandId } });

    try {
      await axios.post(process.env.N8N_DELETE_RAG_URL, { brandId });
      console.log(`✅ Все документы бренда ${brandId} удалены и отправлен запрос в n8n`);
    } catch (e) {
      console.error('❌ Ошибка отправки запроса в n8n после удаления документов:', e.message);
    }

    req.flash('success', 'All documents deleted');
    res.redirect('/brands/' + brandId);

  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete documents');
    res.redirect('/brands/' + brandId);
  }
});

app.post('/brands/:id/delete', ensureAuth, async (req, res) => {
  const brandId = Number(req.params.id);

  try {
    const docs = await prisma.brandDocument.findMany({
      where: { brandId }
    });

    docs.forEach(d => {
      const filePath = path.join(__dirname, 'uploads', d.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await prisma.brandDocument.deleteMany({
      where: { brandId }
    });

    await prisma.post.deleteMany({
      where: { brandId }
    });

    await prisma.brand.delete({
      where: { id: brandId }
    });

    req.flash('success', 'Brand and all related files have been deleted');
    res.redirect('/');

  } catch (err) {
    console.error('Delete brand error:', err);
    req.flash('error', 'Failed to delete brand');
    res.redirect('/brands/' + brandId);
  }
});


app.get('/brands/:id', ensureAuth, async (req, res) => {
  const brandId = parseInt(req.params.id);

  const brand = await prisma.brand.findUnique({
    where: { id: brandId }
  });

  if (!brand) {
    req.flash('error', 'Brand not found');
    return res.redirect('/');
  }

  const docs = await prisma.brandDocument.findMany({
    where: { brandId },
    orderBy: { uploadedAt: 'desc' }
  });

  const posts = await prisma.post.findMany({
    where: { brandId },
    orderBy: { createdAt: 'desc' }
  });

  res.render('brand_view', {
    user: req.session.user,
    brand,
    docs,
    posts,
    messages: req.flash()
  });
});


app.post('/brands/:id/rename', ensureAuth, async (req, res) => {
  const brandId = parseInt(req.params.id);
  const { name } = req.body;

  if (!name || !name.trim()) return res.json({ success: false, error: 'Name cannot be empty' });

  try {
    await prisma.brand.update({
      where: { id: brandId },
      data: { name: name.trim() }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Rename brand error:', err);
    res.json({ success: false, error: 'Failed to rename brand' });
  }
});

app.get('/brands/:id/posts/new', ensureAuth, async (req,res)=>{
  const brandId = parseInt(req.params.id);
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  res.render('post_new', { user: req.session.user, brand, messages: req.flash() });
});


app.post('/brands/:id/posts/new', ensureAuth, upload.single('image'), async (req,res)=>{
  try {
    const brandId = parseInt(req.params.id);
    const { title, body, schedule_at, platform, language } = req.body;

    console.log(req.flash());
    console.log('Выбранная платформа:', platform);
    console.log('Выбранный язык:', language);

    const imagePath = req.file ? req.file.filename : null;
    const scheduleAtDate = schedule_at ? new Date(schedule_at) : null;
    const status = scheduleAtDate ? 'scheduled' : 'draft';
    const createdById = req.session.user.id;

    const post = await prisma.post.create({
      data: {
        brandId,
        title: title || null,
        body: sanitizeHtml(body || null),
        imagePath,
        platform,
        language,
        scheduleAt: scheduleAtDate,
        status,
        createdById
      }
    });

    req.flash('success','Post created/scheduled');
    res.redirect('/brands/'+brandId);

  } catch(e){
    console.error(e);
    req.flash('error','Failed to create post: '+e.message);
    res.redirect(req.get('Referrer') || '/');
  }
});

async function generatePostPreview(postId) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  const brand = await prisma.brand.findUnique({ where: { id: post.brandId }, include: { documents: true } });

  const FormData = require('form-data');
  const webhook = process.env.N8N_GENERATE_WEBHOOK_URL;
  const form = new FormData();
  form.append('brandId', brand.id);
  form.append('brand_name', brand.name);
  form.append('brand_description', brand.description || '');
  form.append('title', post.title || '');
  form.append('body', post.body || '');
  form.append('platform', post.platform || '');
  form.append('language', post.language || '');

  if (post.imagePath) {
    const imgPath = path.join(UPLOAD_DIR, post.imagePath);
    if (fs.existsSync(imgPath)) {
      form.append('data', fs.createReadStream(imgPath), { filename: 'data', contentType: (post.platform === 'tiktok' ? 'video/mp4' : 'image/png') });
    }
  }

  const axiosRes = await axios.post(webhook, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  console.log(post.body);

  let preview = Array.isArray(axiosRes.data) ? axiosRes.data[0] : axiosRes.data;

  await prisma.post.update({
    where: { id: postId },
    data: {
      title: preview.title || post.title || null,
      body: post.body || null,
      shortText: preview.short_text || null,
      longText: preview.long_text || null,
      caption: preview.caption || null,
      hashtags: preview.hashtags || [],
      imagePath: preview.image || null
    }
  });

  return preview;
}

app.get('/posts/:id/preview', ensureAuth, async (req, res) => {
  const postId = parseInt(req.params.id);

  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    req.flash('error', 'Post not found');
    return res.redirect('/');
  }

  if (post.isGenerating) {
    return res.render("loading_preview", { postId });
  }

  const preview = {
    title: post.title,
    body: post.longText || post.body,
    shortText: post.shortText,
    longText: post.longText,
    caption: post.caption,
    hashtags: post.hashtags,
    image: post.imagePath,
    video: post.videoPath,
  };

  res.render("post_preview", {
    post,
    preview,
    platform: post.platform,
    brandId: post.brandId,
    user: req.session.user,
    messages: req.flash()
  });
});


const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'tiktok_video', maxCount: 1 }
]);


app.post('/brands/:id/posts/generate', ensureAuth, uploadFields, async (req, res) => {
  try {
    const brandId = parseInt(req.params.id);
    console.log(req.body);
    const title = req.body.title || req.body.tiktok_title;
    const body = req.body.body || req.body.tiktok_desc || '';
    const platform = req.body.platform || (req.body.tiktok_title ? 'tiktok' : null);
    const language = req.body.language || req.body.tiktok_language;

    const imageFile = req.files['image']?.[0]?.filename;
    const videoFile = req.files['tiktok_video']?.[0]?.filename;

    const scheduleAt = req.body.schedule_at
      ? new Date(req.body.schedule_at)
      : req.body.tiktok_schedule_at
      ? new Date(req.body.tiktok_schedule_at)
      : null;

    const now = new Date();
    const status = scheduleAt && scheduleAt > now ? 'scheduled' : 'draft';

    const post = await prisma.post.create({
      data: {
        brandId,
        title,
        body,
        platform,
        language,
        status,
        scheduleAt,
        createdById: req.session.user.id,
        imagePath: platform === 'tiktok' ? videoFile || null : imageFile || null,
        isGenerating: true
      }
    });

    (async () => {
      try {
        // let preview = {};

        // if (platform === 'tiktok1') {
        //   if (!videoFile) {
        //     const resVideo = await axios.post(process.env.N8N_GENERATE_WEBHOOK_URL, {
        //       title,
        //       description: body,
        //       language,
        //       credentials: brand.tiktokCredentials || {}
        //     }, { responseType: 'arraybuffer' });

        //     const videoFileName = `tiktok_${post.id}_${Date.now()}.mp4`;
        //     fs.writeFileSync(path.join(UPLOAD_DIR, videoFileName), resVideo.data);

        //     await prisma.post.update({
        //       where: { id: post.id },
        //       data: { videoPath: videoFileName }
        //     });
        //   }
        // } else {
        await generatePostPreview(post.id);
        // }

        await prisma.post.update({
          where: { id: post.id },
          data: { isGenerating: false }
        });

      } catch (err) {
        console.error("Async generation failed:", err);
        await prisma.post.update({
          where: { id: post.id },
          data: { isGenerating: false }
        });
      }
    })();

    res.json({ success: true, postId: post.id });

  } catch (e) {
    console.error(e);
    res.json({ success: false, error: e.message });
  }
});

app.post('/posts/:id/approve', ensureAuth, async (req, res) => {
  const postId = parseInt(req.params.id);

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    let newStatus;
    console.log(post.scheduleAt, new Date(post.scheduleAt))
    if (post.scheduleAt && new Date(post.scheduleAt) > new Date()) {
      newStatus = 'scheduled';
      console.log(newStatus);
      req.flash('success', `Пост запланирован на ${new Date(post.scheduleAt).toLocaleString()}`);
    } else {
      newStatus = 'approved';
      console.log(newStatus);
      req.flash('success', 'Пост отправлен на публикацию');
    }

    await prisma.post.update({
      where: { id: postId },
      data: { status: newStatus }
    });

    res.redirect(`/brands/${post.brandId}`);

    if (newStatus === 'approved') {
      sendPostToN8N(postId)
        .then(() => console.log(`✅ Фоновая публикация поста ${postId} завершена`))
        .catch(err => console.error(`❌ Ошибка фоновой публикации ${postId}:`, err.message));
    }

  } catch (e) {
    console.error('Ошибка при публикации поста:', e);
    req.flash('error', 'Не удалось опубликовать пост: ' + e.message);
    res.redirect('/');
  }
});

app.get("/posts/:id/status", async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { id: parseInt(req.params.id) }
  });

  res.json({ ready: !post.isGenerating });
});

async function sendPostToN8N(postId) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('Post not found');

  if (post.status !== 'approved' && post.status !== 'scheduled') {
    console.log(`Post ${postId} не одобрен, пропускаем отправку`);
    return;
  }

  const brand = await prisma.brand.findUnique({ where: { id: post.brandId }, include: { documents: true } });

  const FormData = require('form-data');

  const form = new FormData();

  form.append("brand_id", brand.id.toString());
  form.append("brand_name", brand.name);
  form.append("brand_description", brand.description || "");
  form.append("platform", post.platform || "");
  form.append("language", post.language || "");
  form.append("post_id", String(post.id));
  form.append("title", post.title || "");
  form.append("short_text", post.shortText || "");
  form.append("long_text", post.longText || "");
  form.append("caption", post.caption || "");
  form.append("hashtags", (post.hashtags || []).join(" "));
  form.append("body", post.body || "");
  form.append("telegram", brand.telegramChannel || "null");
  form.append("wordpress", JSON.stringify(brand.wordpressCredentials || {}));
  form.append("linkedin", JSON.stringify(brand.linkedinCredentials || {}));
  form.append("tiktok", brand.tiktokCredentials || "null");
  form.append("image_base64", post.imagePath);

  let igCredentials = brand.instagramCredentials ? { ...brand.instagramCredentials } : {};
  let fbCredentials = brand.facebookCredentials ? { ...brand.facebookCredentials } : {};

  try {
    if (brand.instagramCredentials) {
      const refreshedIg = await refreshBrandToken(brand, 'instagram');
      if (refreshedIg) igCredentials = refreshedIg;
    }
  } catch (e) {
    console.error('Failed to refresh instagram token for brand', brand.id, e.message || e);
  }

  try {
    if (brand.facebookCredentials) {
      const refreshedFb = await refreshBrandToken(brand, 'facebook');
      if (refreshedFb) fbCredentials = refreshedFb;
    }
  } catch (e) {
    console.error('Failed to refresh facebook token for brand', brand.id, e.message || e);
  }

  const globalTokenAfterRefresh = await getGlobalInstagramFacebookToken();

  form.append("instagram", JSON.stringify(igCredentials || {}));
  form.append("facebook", JSON.stringify(fbCredentials || {}));
  form.append("instagramFacebook_token", globalTokenAfterRefresh || null);

  try {
    await axios.post(process.env.N8N_WEBHOOK_TO_POST_URL, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    await prisma.post.update({ where: { id: postId }, data: { status: 'sent' } });
    console.log(`✅ Post ${postId} успешно отправлен на n8n`);
  } catch (e) {
    console.error(`❌ Ошибка отправки поста ${postId} на n8n:`, e.message);
    await prisma.post.update({ where: { id: postId }, data: { status: 'failed', lastError: e.message } });
    throw e;
  }
}

setInterval(async ()=>{
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'scheduled', scheduleAt: { lte: new Date() } }
    });
    for (const p of posts) {
      try {
        await sendPostToN8N(p.id);
      } catch(e){
        console.error('Error sending scheduled post', p.id, e.message);
      }
    }
  } catch(e){
    console.error('Scheduler error', e);
  }
}, 60*1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('SMM admin running on port', PORT));