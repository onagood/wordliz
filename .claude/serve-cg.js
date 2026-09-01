// Tiny static server over dist/crazygames for smoke-testing the portal build locally.
// The CrazyGames SDK runs in its 'local' environment here and logs every event it gets.
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','dist','crazygames');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png',
  '.woff2':'font/woff2','.woff':'font/woff'};
http.createServer((req,res)=>{
  const p=decodeURIComponent(req.url.split('?')[0]);
  let f=path.join(ROOT,p==='/'?'index.html':p);
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}
  // no caching: the whole point of this server is seeing the build that is on disk now
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(f).pipe(res);
}).listen(8791,()=>console.log('serving '+ROOT+' on http://localhost:8791'));
