import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../site/',import.meta.url)));
const port=Number(process.env.PORT || 4173);
const types={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    let file=resolve(root,'.'+pathname);
    if(file!==root && !file.startsWith(root+sep))throw Error('Invalid path');
    if((await stat(file)).isDirectory())file=join(file,'index.html');
    if(!(await stat(file)).isFile())throw Error('Not a file');
    response.writeHead(200,{'content-type':types[extname(file)] || 'application/octet-stream','cache-control':'no-store'});
    createReadStream(file).pipe(response);
  }catch{response.writeHead(404,{'content-type':'text/plain'}).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Sponge City: http://127.0.0.1:${port}/`));
