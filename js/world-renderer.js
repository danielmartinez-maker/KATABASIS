/* Raster-backed, batched WebGL world presentation. Gameplay stays in World/Game. */
(function () {
  'use strict';
  const K=window.K, R={}; K.WorldRenderer=R;
  const VERTEX='attribute vec2 a_position;attribute vec2 a_uv;attribute vec4 a_color;attribute float a_mode;uniform vec2 u_resolution;varying vec2 v_uv;varying vec4 v_color;varying float v_mode;void main(){vec2 p=a_position/u_resolution*2.0-1.0;gl_Position=vec4(p.x,-p.y,0.0,1.0);v_uv=a_uv;v_color=a_color;v_mode=a_mode;}';
  const FRAGMENT='precision mediump float;uniform sampler2D u_texture;uniform float u_time;uniform float u_light;varying vec2 v_uv;varying vec4 v_color;varying float v_mode;void main(){vec4 tex=texture2D(u_texture,v_uv);float light=u_light;if(v_mode>0.5&&v_mode<1.5){float r=length((v_uv-0.5)*2.0);tex=vec4(1.0,1.0,1.0,pow(max(0.0,1.0-r),1.5));light=1.0;}if(v_mode>1.5&&v_mode<2.5){light+=0.045*sin(v_uv.x*18.0+v_uv.y*12.0+u_time*1.4);}if(v_mode>2.5){light=1.0;}gl_FragColor=vec4(tex.rgb*v_color.rgb*light,tex.a*v_color.a);}';
  R.project=function(cam,x,y,height){return{x:K.W/2+(x-cam.x+(cam.ox||0))*cam.zoom,y:K.H/2+(y-cam.y+(cam.oy||0)-(height||0))*cam.zoom};};
  R.visible=function(cam,b,padding){const p=R.project(cam,b.x,b.y,0),pad=(padding||180)*cam.zoom,w=(b.w||0)*cam.zoom,h=(b.h||0)*cam.zoom;return p.x+w>=-pad&&p.y+h>=-pad&&p.x<=K.W+pad&&p.y<=K.H+pad;};
  R.color=(function(){
    const cache=Object.create(null);let size=0;
    return function(value,alpha){
      const a=alpha===undefined?1:alpha,key=String(value||'#ffffff')+'|'+a;
      const hit=cache[key];if(hit)return hit.slice();
      let s=String(value||'#ffffff'),rgb=[1,1,1],al=a;
      if(s[0]==='#'){let h=s.slice(1);if(h.length===3)h=h.split('').map(x=>x+x).join('');const n=parseInt(h,16);if(Number.isFinite(n))rgb=[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
      else {const m=s.match(/rgba?\(([^)]+)\)/);if(m){const p=m[1].split(',').map(Number);rgb=p.slice(0,3).map(x=>x/255);if(p.length>3)al*=p[3];}}
      const out=rgb.concat(Math.max(0,Math.min(1,al)));
      if(size<512){cache[key]=out;size++;}
      return out.slice();
    };
  })();
  function viewRect(cam,padding){
    const z=cam.zoom||1,pad=(padding===undefined?180:padding)*z;
    const cx=cam.x-(cam.ox||0),cy=cam.y-(cam.oy||0);
    const hw=(K.W/2+pad)/z,hh=(K.H/2+pad)/z;
    return{x0:cx-hw,x1:cx+hw,y0:cy-hh,y1:cy+hh};
  }
  R.viewRect=viewRect;
  function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(e);}return s;}
  function multiply(m,n){return[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];}
  R.create=function(canvas){
    let gl;try{gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false})||canvas.getContext('experimental-webgl',{alpha:false});}catch(e){return null;}
    if(!gl||typeof gl.createShader!=='function'||typeof gl.drawArrays!=='function')return null;
    try{return new Context(canvas,gl);}catch(e){R.lastError=String(e.message||e);return null;}
  };
  function Context(canvas,gl){
    this.canvas=canvas;this.gl=gl;this._webgl=true;this.lost=false;this._textures=new Map();this._texts=new Map();this._stack=[];this._vertices=[];this._current=null;this._m=[1,0,0,1,0,0];
    this.globalAlpha=1;this.fillStyle='#ffffff';this.strokeStyle='#ffffff';this.lineWidth=1;this.font='16px Georgia';this.textAlign='left';this.textBaseline='alphabetic';this.mode=0;this.light=0.94;
    this.stats={drawCalls:0,quads:0,textures:0,frameMs:0};this._init();
    if(canvas.addEventListener){canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;if(this.onLost)this.onLost();});canvas.addEventListener('webglcontextrestored',()=>{const gl=this.gl;if(this.program)gl.deleteProgram(this.program);if(this.buffer)gl.deleteBuffer(this.buffer);if(this.white)gl.deleteTexture(this.white);this._textures.forEach(tex=>gl.deleteTexture(tex));this._textures.clear();this._texts.clear();this._current=null;this._vertices=[];this._wprog=null;this._wprogFailed=false;this._terrainStatic=null;this._init();this.lost=false;if(this.onRestored)this.onRestored();});}
  }
  Context.prototype._init=function(){
    const gl=this.gl,vs=shader(gl,gl.VERTEX_SHADER,VERTEX),fs=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT),p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
    this.program=p;this.buffer=gl.createBuffer();gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    this._attrLocs=[['a_position',2,0],['a_uv',2,8],['a_color',4,16],['a_mode',1,32]].map(a=>({loc:gl.getAttribLocation(p,a[0]),size:a[1],off:a[2]}));
    this._attrLocs.forEach(a=>{gl.enableVertexAttribArray(a.loc);gl.vertexAttribPointer(a.loc,a.size,gl.FLOAT,false,36,a.off);});
    this.resolution=gl.getUniformLocation(p,'u_resolution');this.timeUniform=gl.getUniformLocation(p,'u_time');this.lightUniform=gl.getUniformLocation(p,'u_light');
    gl.uniform1i(gl.getUniformLocation(p,'u_texture'),0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
    this.white=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.white);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));this._parameters();
  };
  Context.prototype._parameters=function(){const g=this.gl;g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);};
  Context.prototype.texture=function(image){
    if(!image||!(image.naturalWidth||image.width)||!(image.naturalHeight||image.height))return null;
    const hit=this._textures.get(image);if(hit){this._textures.delete(image);this._textures.set(image,hit);return hit;}
    if(this._textures.size>=192){this.flush();const iter=this._textures.keys();let old=iter.next().value;while(old&&(old===this._current||this._textures.get(old)===this.white)){old=iter.next().value;}if(old){this.gl.deleteTexture(this._textures.get(old));this._textures.delete(old);}}
    const g=this.gl;const tex=g.createTexture();g.bindTexture(g.TEXTURE_2D,tex);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,image);const err=g.getError();if(err!==g.NO_ERROR){g.deleteTexture(tex);console.warn('[WorldRenderer] texImage2D error:',err);return null;}this._parameters();this._textures.set(image,tex);this.stats.textures=this._textures.size;return tex;
  };
  Context.prototype.beginFrame=function(time,clear){
    const g=this.gl;this._vertices.length=0;this._current=null;this._stack.length=0;const dpr=this.canvas.width/Math.max(1,K.W);this._m=[dpr,0,0,dpr,0,0];this.globalAlpha=1;this.mode=0;
    this._clip=null;this.stats.drawCalls=0;this.stats.quads=0;g.disable(g.SCISSOR_TEST);g.viewport(0,0,this.canvas.width,this.canvas.height);g.useProgram(this.program);g.uniform2f(this.resolution,this.canvas.width,this.canvas.height);g.uniform1f(this.timeUniform,time||0);g.uniform1f(this.lightUniform,this.light);
    const col=R.color(clear||'#120f12');g.clearColor(col[0],col[1],col[2],1);g.clear(g.COLOR_BUFFER_BIT);
  };
  Context.prototype.flush=function(){if(this.lost||!this._vertices.length)return;const g=this.gl;g.bindTexture(g.TEXTURE_2D,this._current||this.white);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);const n=this._vertices.length;let buf=this._floatBuf;if(!buf||buf.length<n){buf=new Float32Array(Math.max(1024,n));this._floatBuf=buf;}buf.set(this._vertices);g.bufferData(g.ARRAY_BUFFER,buf.subarray(0,n),g.DYNAMIC_DRAW);g.drawArrays(g.TRIANGLES,0,n/9);this._vertices.length=0;this.stats.drawCalls++;};
  Context.prototype.quad=function(tex,x,y,w,h,uv,tint,mode){
    if(this.lost||!w||!h)return;if(tex!==this._current){this.flush();this._current=tex;}const m=this._m;
    const ax=x*m[0]+y*m[2]+m[4],ay=x*m[1]+y*m[3]+m[5];
    const bx=ax+w*m[0],by=ay+w*m[1],cx=bx+h*m[2],cy=by+h*m[3],dx=ax+h*m[2],dy=ay+h*m[3];
    const u0=uv[0],v0=uv[1],u1=uv[2],v1=uv[3],r=tint[0],g=tint[1],b=tint[2],a=tint[3],md=mode===undefined?this.mode:mode;
    const v=this._vertices;
    v.push(ax,ay,u0,v0,r,g,b,a,md, bx,by,u1,v0,r,g,b,a,md, cx,cy,u1,v1,r,g,b,a,md,
      ax,ay,u0,v0,r,g,b,a,md, cx,cy,u1,v1,r,g,b,a,md, dx,dy,u0,v1,r,g,b,a,md);
    this.stats.quads++;if(v.length>54000)this.flush();
  };
  Context.prototype.drawImage=function(image){
    const a=Array.prototype.slice.call(arguments,1),iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,tex=this.texture(image);if(!tex)return;
    let sx=0,sy=0,sw=iw,sh=ih,x,y,w,h;if(a.length===8){[sx,sy,sw,sh,x,y,w,h]=a;}else{[x,y,w,h]=a;w=w===undefined?iw:w;h=h===undefined?ih:h;}
    this.quad(tex,x,y,w,h,[sx/iw,sy/ih,(sx+sw)/iw,(sy+sh)/ih],[1,1,1,this.globalAlpha]);
  };
  Context.prototype.save=function(){this._stack.push({m:this._m.slice(),alpha:this.globalAlpha,fill:this.fillStyle,stroke:this.strokeStyle,font:this.font,align:this.textAlign,baseline:this.textBaseline,mode:this.mode,lineWidth:this.lineWidth,clip:this._clip});};
  Context.prototype.restore=function(){const s=this._stack.pop();if(!s)return;if(this._clip!==s.clip){this.flush();this._clip=s.clip;this._applyClip();}this._m=s.m;this.globalAlpha=s.alpha;this.fillStyle=s.fill;this.strokeStyle=s.stroke;this.font=s.font;this.textAlign=s.align;this.textBaseline=s.baseline;this.mode=s.mode;this.lineWidth=s.lineWidth;};
  Context.prototype.beginPath=function(){this._path=null;};
  Context.prototype.rect=function(x,y,w,h){const m=this._m;this._path=[x*m[0]+y*m[2]+m[4],x*m[1]+y*m[3]+m[5],Math.abs(w*m[0]),Math.abs(h*m[3])];};
  Context.prototype._applyClip=function(){const g=this.gl;if(!this._clip){g.disable(g.SCISSOR_TEST);return;}g.enable(g.SCISSOR_TEST);const c=this._clip;g.scissor(Math.floor(c[0]),Math.floor(this.canvas.height-c[1]-c[3]),Math.max(0,Math.ceil(c[2])),Math.max(0,Math.ceil(c[3])));};
  Context.prototype.clip=function(){this.flush();this._clip=this._path;this._applyClip();};
  Context.prototype.translate=function(x,y){this._m=multiply(this._m,[1,0,0,1,x,y]);};
  Context.prototype.scale=function(x,y){this._m=multiply(this._m,[x,0,0,y,0,0]);};
  Context.prototype.rotate=function(a){this._m=multiply(this._m,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);};
  Context.prototype.setTransform=function(a,b,c,d,e,f){this._m=[a,b,c,d,e,f];};
  Context.prototype.fillRect=function(x,y,w,h){this.quad(this.white,x,y,w,h,[0,0,1,1],R.color(this.fillStyle,this.globalAlpha),3);};
  Context.prototype.strokeRect=function(x,y,w,h){this.save();this.fillStyle=this.strokeStyle;const n=this.lineWidth;this.fillRect(x,y,w,n);this.fillRect(x,y+h-n,w,n);this.fillRect(x,y,n,h);this.fillRect(x+w-n,y,n,h);this.restore();};
  Context.prototype.clearRect=function(){this.flush();};
  Context.prototype.shadow=function(x,y,w,h,alpha){this.quad(this.white,x-w/2,y-h/2,w,h,[0,0,1,1],[0,0,0,alpha||0.45],1);};
  Context.prototype.fillText=function(text,x,y){
    const key=this.font+'|'+this.fillStyle+'|'+text;let item=this._texts.get(key);
    if(!item){const c=document.createElement('canvas'),t=c.getContext('2d');if(!t)return;t.font=this.font;const metrics=t.measureText(String(text)),size=parseInt(this.font.match(/(\d+)px/)?.[1]||'16',10);c.width=Math.ceil(metrics.width+16);c.height=Math.ceil(size*1.8+12);t.font=this.font;t.fillStyle=this.fillStyle;t.shadowColor='#090708';t.shadowBlur=4;t.textBaseline='middle';t.fillText(String(text),8,c.height/2);item={image:c,width:c.width,height:c.height};
      if(this._texts.size>256){const oldest=this._texts.keys().next().value,old=this._texts.get(oldest),tex=this._textures.get(old.image);if(tex)this.gl.deleteTexture(tex);this._textures.delete(old.image);this._texts.delete(oldest);}this._texts.set(key,item);}
    let dx=x-8;if(this.textAlign==='center')dx=x-item.width/2;else if(this.textAlign==='right')dx=x-item.width+8;const dy=this.textBaseline==='middle'?y-item.height/2:y-item.height*0.65;const mode=this.mode;this.mode=3;this.drawImage(item.image,dx,dy,item.width,item.height);this.mode=mode;
  };
  Context.prototype.strokeText=function(text,x,y){
    const value=String(text),key='stroke|'+this.font+'|'+this.strokeStyle+'|'+this.lineWidth+'|'+value;let item=this._texts.get(key);
    if(!item){
      const c=document.createElement('canvas'),t=c.getContext('2d');if(!t)return;
      t.font=this.font;const metrics=t.measureText(value),size=parseInt(this.font.match(/(\d+)px/)?.[1]||'16',10);
      c.width=Math.ceil(metrics.width+16);c.height=Math.ceil(size*1.8+12);t.font=this.font;t.strokeStyle=this.strokeStyle;t.lineWidth=this.lineWidth;t.lineJoin='round';t.textBaseline='middle';t.strokeText(value,8,c.height/2);
      item={image:c,width:c.width,height:c.height};
      if(this._texts.size>256){const oldest=this._texts.keys().next().value,old=this._texts.get(oldest),tex=this._textures.get(old.image);if(tex)this.gl.deleteTexture(tex);this._textures.delete(old.image);this._texts.delete(oldest);}this._texts.set(key,item);
    }
    let dx=x-8;if(this.textAlign==='center')dx=x-item.width/2;else if(this.textAlign==='right')dx=x-item.width+8;const dy=this.textBaseline==='middle'?y-item.height/2:y-item.height*0.65;const mode=this.mode;this.mode=3;this.drawImage(item.image,dx,dy,item.width,item.height);this.mode=mode;
  };
  Context.prototype.outlinedText=function(text,x,y){
    const value=String(text),blur=Number.isFinite(this.shadowBlur)?this.shadowBlur:4,
      shadow=this.shadowColor||'#090708',key='outlined|'+this.font+'|'+this.fillStyle+'|'+this.strokeStyle+'|'+this.lineWidth+'|'+shadow+'|'+blur+'|'+value;
    let item=this._texts.get(key);
    if(!item){
      const c=document.createElement('canvas'),t=c.getContext('2d');if(!t)return;
      t.font=this.font;const metrics=t.measureText(value),size=parseInt(this.font.match(/(\d+)px/)?.[1]||'16',10);
      c.width=Math.ceil(metrics.width+16);c.height=Math.ceil(size*1.8+12);t.font=this.font;t.textBaseline='middle';t.lineJoin='round';
      t.strokeStyle=this.strokeStyle;t.lineWidth=this.lineWidth;t.shadowColor=shadow;t.shadowBlur=0;t.strokeText(value,8,c.height/2);
      t.fillStyle=this.fillStyle;t.shadowBlur=blur;t.fillText(value,8,c.height/2);
      item={image:c,width:c.width,height:c.height};
      if(this._texts.size>256){const oldest=this._texts.keys().next().value,old=this._texts.get(oldest),tex=this._textures.get(old.image);if(tex)this.gl.deleteTexture(tex);this._textures.delete(old.image);this._texts.delete(oldest);}this._texts.set(key,item);
    }
    let dx=x-8;if(this.textAlign==='center')dx=x-item.width/2;else if(this.textAlign==='right')dx=x-item.width+8;const dy=this.textBaseline==='middle'?y-item.height/2:y-item.height*0.65;const mode=this.mode;this.mode=3;this.drawImage(item.image,dx,dy,item.width,item.height);this.mode=mode;
  };
  Context.prototype.dispose=function(){this.flush();const gl=this.gl;this._textures.forEach(tex=>gl.deleteTexture(tex));this._textures.clear();this._texts.clear();gl.deleteTexture(this.white);gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);};
  const VERTEX_W='attribute vec2 a_position;attribute vec2 a_uv;attribute vec4 a_color;attribute float a_mode;uniform vec2 u_resolution;uniform vec2 u_cam;uniform vec2 u_off;uniform float u_zoom;uniform vec2 u_center;uniform float u_dpr;varying vec2 v_uv;varying vec4 v_color;varying float v_mode;void main(){vec2 w=(a_position-u_cam+u_off)*u_zoom+u_center;vec2 p=w*u_dpr/u_resolution*2.0-1.0;gl_Position=vec4(p.x,-p.y,0.0,1.0);v_uv=a_uv;v_color=a_color;v_mode=a_mode;}';
  // One static vertex buffer per region: the whole terrain layer becomes a single
  // GPU draw call with zero per-frame CPU encoding. Camera motion is a uniform,
  // so revisiting cleared ground costs nothing on the main thread.
  function worldProgram(ctx){
    if(ctx._wprog)return ctx._wprog;
    if(ctx._wprogFailed)return null;
    try{
      const gl=ctx.gl,vs=shader(gl,gl.VERTEX_SHADER,VERTEX_W),fs=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT),p=gl.createProgram();
      gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
      const A2=n=>gl.getAttribLocation(p,n),U2=n=>gl.getUniformLocation(p,n);
      ctx._wprog={prog:p,loc:{pos:A2('a_position'),uv:A2('a_uv'),col:A2('a_color'),mode:A2('a_mode')},
        u:{res:U2('u_resolution'),cam:U2('u_cam'),off:U2('u_off'),zoom:U2('u_zoom'),center:U2('u_center'),dpr:U2('u_dpr'),time:U2('u_time'),light:U2('u_light'),tex:U2('u_texture')}};
    }catch(e){ctx._wprogFailed=true;R.lastError=String((e&&e.message)||e);console.error('[WorldRenderer] shader link failed:',e.message);return null;}
    return ctx._wprog;
  }
  function pushStaticQuad(out,x,y,w,h,uv,tint,mode){
    const u0=uv[0],v0=uv[1],u1=uv[2],v1=uv[3],r=tint[0],g=tint[1],b=tint[2],a=tint[3];
    out.push(x,y,u0,v0,r,g,b,a,mode, x+w,y,u1,v0,r,g,b,a,mode, x+w,y+h,u1,v1,r,g,b,a,mode,
      x,y,u0,v0,r,g,b,a,mode, x+w,y+h,u1,v1,r,g,b,a,mode, x,y+h,u0,v1,r,g,b,a,mode);
  }
  function buildTerrainStatic(world,floorIW,floorIH){
    const s=world.tileSize||80,cells=world.cells||[],SPAN=8;
    const sw=floorIW/4,sh=floorIH/4,uvs=[];
    for(let n=0;n<16;n++){const sx=(n%4)*sw,sy=(Math.floor(n/4)%4)*sh;uvs.push([sx/floorIW,sy/floorIH,(sx+sw)/floorIW,(sy+sh)/floorIH]);}
    const walk=walkKeys(world),bins=new Map();
    function bin(gx,gy){
      const key=Math.floor(gx/SPAN)+','+Math.floor(gy/SPAN);
      let b=bins.get(key);if(!b){b={out:[],x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity};bins.set(key,b);}
      return b;
    }
    for(let ci=0;ci<cells.length;ci++){
      const c=cells[ci],x=c.x-s/2,y=c.y-s/2,height=c.height||0;
      const gx=Math.round(c.x/s),gy=Math.round(c.y/s);
      const salt=gx*7+gy*3,n=salt<0?-salt:salt;
      let shade=(hash2(gx,gy)*5)|0;
      const b=bin(gx,gy);
      if(x<b.x0)b.x0=x;if(y<b.y0)b.y0=y;if(x+s>b.x1)b.x1=x+s;if(y+s>b.y1)b.y1=y+s;
      if(height>0){if(y+s-height<b.y0)b.y0=y+s-height;pushStaticQuad(b.out,x,y+s-height,s,height+12,uvs[5%16],TINT_RAISE,0);}
      const liquid=c.kind==='water'||c.kind==='lava';
      let base;
      if(c.walkable){
        base=liquid?1:0;
        if(!liquid&&(!walk.has(gx*4096+gy-1)||!walk.has(gx*4096+gy+1)||!walk.has((gx-1)*4096+gy)||!walk.has((gx+1)*4096+gy)))shade=Math.max(0,shade-1);
      }
      else if(liquid){
        base=2;
        if(walk.has(gx*4096+gy-1)||walk.has(gx*4096+gy+1)||walk.has((gx-1)*4096+gy)||walk.has((gx+1)*4096+gy))base=4;
      }
      else base=3;
      pushStaticQuad(b.out,x,y,s+1,s+1,uvs[n%16],TINTS[base*5+shade],liquid?2:0);
    }
    let total=0;bins.forEach(b=>{b.start=total;total+=b.out.length/9;});
    const data=new Float32Array(total*9);let quads=0;
    const chunks=[];
    bins.forEach(b=>{
      data.set(b.out,b.start*9);quads+=b.out.length/9/6;
      chunks.push({start:b.start,count:b.out.length/9,x0:b.x0,y0:b.y0,x1:b.x1,y1:b.y1});
      b.out=null;
    });
    return{data,chunks,quads};
  }
  function bindDynamicAttribs(ctx){
    const gl=ctx.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER,ctx.buffer);
    ctx._attrLocs.forEach(a=>{gl.enableVertexAttribArray(a.loc);gl.vertexAttribPointer(a.loc,a.size,gl.FLOAT,false,36,a.off);});
  }
  function drawTerrainDynamic(ctx,world,family,size,view,floorTex,floorIW,floorIH){
    const cells=world.cells||[],hs=size/2,sw=floorIW/4,sh=floorIH/4,uvs=[];
    for(let n=0;n<16;n++){const sx=(n%4)*sw,sy=(Math.floor(n/4)%4)*sh;uvs.push([sx/floorIW,sy/floorIH,(sx+sw)/floorIW,(sy+sh)/floorIH]);}
    const walk=walkKeys(world);
    for(let ci=0;ci<cells.length;ci++){
      const c=cells[ci],x=c.x-hs,y=c.y-hs;
      if(x+size<view.x0||y+size<view.y0||x>view.x1||y>view.y1)continue;
      const height=c.height||0;
      const gx=Math.round(c.x/size),gy=Math.round(c.y/size);
      const salt=gx*7+gy*3,n=salt<0?-salt:salt;
      let shade=(hash2(gx,gy)*5)|0;
      if(height>0)ctx.quad(floorTex,x,y+size-height,size,height+12,uvs[5%16],TINT_RAISE,0);
      const liquid=c.kind==='water'||c.kind==='lava';
      let base;
      if(c.walkable){
        base=liquid?1:0;
        if(!liquid&&(!walk.has(gx*4096+gy-1)||!walk.has(gx*4096+gy+1)||!walk.has((gx-1)*4096+gy)||!walk.has((gx+1)*4096+gy)))shade=Math.max(0,shade-1);
      }
      else if(liquid){
        base=2;
        if(walk.has(gx*4096+gy-1)||walk.has(gx*4096+gy+1)||walk.has((gx-1)*4096+gy)||walk.has((gx+1)*4096+gy))base=4;
      }
      else base=3;
      ctx.quad(floorTex,x,y,size+1,size+1,uvs[n%16],TINTS[base*5+shade],liquid?2:0);
    }
  }
  function drawTerrain(ctx,G,world,cam,family,size){
    const A=K.Assets;
    // Resolve through the same alias chain as artFamily so new destinations
    // without their own floor art reuse the base region's floor instead of void.
    const floorAliases={ancient_greece:'asphodel',atlantis:'aegean'};
    const floorFamily=floorAliases[family]||family;
    const floorId='region.'+floorFamily+'.floor';
    const floorImage=A.image(floorId);
    let floorTex=null,floorIW=0,floorIH=0;
    if(floorImage){floorIW=floorImage.naturalWidth||floorImage.width||1;floorIH=floorImage.naturalHeight||floorImage.height||1;if(floorIW>0&&floorIH>0)floorTex=ctx.texture(floorImage);}
    if(!floorTex){
      // Flat-color fallback: never leave terrain void on missing art.
      const view=R.viewRect(cam,size);
      const col=R.color(world&&world.profile&&world.profile.ground||'#1a1512',1);
      ctx.fillStyle=world&&world.profile&&world.profile.ground||'#1a1512';
      ctx.globalAlpha=1;
      ctx.fillRect(view.x0,view.y0,view.x1-view.x0,view.y1-view.y0);
      ctx.flush();
      return;
    }
    const view=R.viewRect(cam,size);
    let st=ctx._terrainStatic;
    if(!st||st.world!==world||st.size!==size){
      if(st&&st.buf&&ctx.gl&&!ctx.lost){try{ctx.gl.deleteBuffer(st.buf);}catch(e){}}
      st=null;
      const wp=ctx.gl&&worldProgram(ctx);
      if(wp){
        const built=buildTerrainStatic(world,floorIW,floorIH);
        const g=ctx.gl,buf=g.createBuffer();
        if(!buf){console.error('[WorldRenderer] createBuffer failed');st=null;return;}
        g.bindBuffer(g.ARRAY_BUFFER,buf);g.bufferData(g.ARRAY_BUFFER,built.data,g.STATIC_DRAW);
        const err=g.getError();
        if(err!==g.NO_ERROR){console.error('[WorldRenderer] bufferData error:',err);g.deleteBuffer(buf);st=null;return;}
        st={world,size,buf,chunks:built.chunks,tex:floorTex};ctx._terrainStatic=st;
      }
    }
    if(!st){drawTerrainDynamic(ctx,world,family,size,view,floorTex,floorIW,floorIH);return;}
    if(st.tex!==floorTex){st.tex=floorTex;}
    ctx.flush();
    const g=ctx.gl,wp=ctx._wprog;
    g.useProgram(wp.prog);
    g.bindBuffer(g.ARRAY_BUFFER,st.buf);
    const L=wp.loc;
    g.enableVertexAttribArray(L.pos);g.vertexAttribPointer(L.pos,2,g.FLOAT,false,36,0);
    g.enableVertexAttribArray(L.uv);g.vertexAttribPointer(L.uv,2,g.FLOAT,false,36,8);
    g.enableVertexAttribArray(L.col);g.vertexAttribPointer(L.col,4,g.FLOAT,false,36,16);
    g.enableVertexAttribArray(L.mode);g.vertexAttribPointer(L.mode,1,g.FLOAT,false,36,32);
    const time=G.realTime||0;
    g.uniform2f(wp.u.res,ctx.canvas.width,ctx.canvas.height);
    g.uniform2f(wp.u.cam,cam.x,cam.y);g.uniform2f(wp.u.off,cam.ox||0,cam.oy||0);
    g.uniform1f(wp.u.zoom,cam.zoom||1);g.uniform2f(wp.u.center,K.W/2,K.H/2);
    g.uniform1f(wp.u.dpr,ctx.canvas.width/Math.max(1,K.W));
    g.uniform1f(wp.u.time,time);g.uniform1f(wp.u.light,ctx.light);
    g.uniform1i(wp.u.tex,0);
    g.bindTexture(g.TEXTURE_2D,st.tex);
    const vrect=R.viewRect(cam,size);
    let drawn=0;
    for(let i=0;i<st.chunks.length;i++){
      const ch=st.chunks[i];
      if(ch.x1<vrect.x0||ch.y1<vrect.y0||ch.x0>vrect.x1||ch.y0>vrect.y1)continue;
      g.drawArrays(g.TRIANGLES,ch.start,ch.count);
      drawn++;ctx.stats.quads+=ch.count/6;
    }
    ctx.stats.drawCalls+=drawn||1;
    g.useProgram(ctx.program);
    bindDynamicAttribs(ctx);
    g.bindTexture(g.TEXTURE_2D,ctx.white);ctx._current=null;
  }
  const familyCache=new WeakMap();
  function artFamily(world){let f=world&&familyCache.get(world);if(f)return f;const aliases={acheron:'styx',lethe_garden:'mourning',knossos:'labyrinth',aeaea:'aegean',colchis:'aegean',delphi:'olympus_approach',pelion:'elysium',arcadia:'asphodel',thebes:'labyrinth',marathon:'gigantomachy',mycenae:'forge',typhon_core:'gigantomachy',ancient_greece:'asphodel',atlantis:'aegean',charon_market:'styx',practice:'tartarus'};const raw=(world&&world.profile&&world.profile.artFamily)||aliases[world&&world.regionId]||(world&&world.regionId);f=aliases[raw]||raw;if(world)familyCache.set(world,f);return f;}
  function imagePatch(ctx,id,x,y,w,h,salt,mode){const image=K.Assets.image(id);if(!image)return;const iw=image.naturalWidth,ih=image.naturalHeight,n=Math.abs(salt||0),sw=iw/4,sh=ih/4;ctx.mode=mode||0;ctx.drawImage(image,(n%4)*sw,(Math.floor(n/4)%4)*sh,sw,sh,x,y,w,h);ctx.mode=0;}
  // Upload a region's floor/props/backdrop before its first visible frame so the
  // transition frame (which already pays for generation) absorbs the upload cost.
  R.prewarmIds=function(ctx,ids){
    if(!ctx||!ctx._webgl||ctx.lost)return 0;
    const A=K.Assets;if(!A||!A.image||!A.entry)return 0;
    let n=0;
    for(const id of ids||[]){
      const e=A.entry(id);if(!e||e.lazy)continue;
      const img=A.image(id);if(img&&ctx.texture(img))n++;
    }
    return n;
  };
  R.prewarmWorld=function(ctx,world){
    if(!ctx||!ctx._webgl||ctx.lost||!world)return 0;
    const family=artFamily(world);
    return R.prewarmIds(ctx,['region.'+family+'.floor','region.'+family+'.props','region.'+family+'.backdrop']);
  };
  // Deterministic per-tile light variation and shoreline foam. Purely visual:
  // derived from tile coordinates, so generation output and saves are unchanged.
  function hash2(x,y){let h=(Math.imul(x,374761393)+Math.imul(y,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
  const SHADES=[0.9,0.95,1.0,1.05,1.1];
  const TINTS=[];
  (function(){
    const alphas=[1,1,0.6,0.38];
    for(let b=0;b<4;b++)for(let s=0;s<5;s++){const v=SHADES[s];TINTS.push([v,v,v,alphas[b]]);}
    for(let s=0;s<5;s++){const v=Math.min(1.22,SHADES[s]+0.14);TINTS.push([v,v,v,0.7]);}
  })();
  const TINT_RAISE=[0.82,0.82,0.82,0.8];
  const walkCache=new WeakMap();
  function walkKeys(world){
    let s=walkCache.get(world);if(s)return s;s=new Set();
    const cells=world.cells||[],ts=world.tileSize||80;
    for(let i=0;i<cells.length;i++){const c=cells[i];if(c.walkable)s.add(Math.round(c.x/ts)*4096+Math.round(c.y/ts));}
    walkCache.set(world,s);return s;
  }
  R.draw=function(ctx,G){
    if(!ctx||!ctx._webgl||ctx.lost)return;const started=typeof performance!=='undefined'?performance.now():0,world=G.world,cam=G.cam,A=K.Assets;
    ctx.beginFrame(G.realTime,world?.profile?.voidColor||'#100c10');
    if(!world){A.drawCover(ctx,'region.tartarus.backdrop',0,0,K.W,K.H);ctx.flush();return;}
    const family=artFamily(world),size=world.tileSize||160,helpers=K.R.worldHelpers;
    // The distant image is a parallax sky layer; all playable ground is generated.
    A.drawCover(ctx,'region.'+family+'.backdrop',-24-Math.sin(cam.x*0.00008)*18,-20-Math.sin(cam.y*0.00008)*12,K.W+80,K.H+70,{alpha:0.32});
    ctx.save();cam.apply(ctx);
    drawTerrain(ctx,G,world,cam,family,size);
    // Props are grounded and depth sorted with actors. Telegraphs always stay visible.
    const things=[];
    for(const prop of world.props||[]){const s=prop.size||100;if(R.visible(cam,{x:prop.x-s/2,y:prop.y-s,w:s,h:s},50))things.push({y:prop.y,prop});}
    for(const ent of K.E.enemies||[])if(ent&&!ent.removeMe&&R.visible(cam,{x:ent.x-100,y:ent.y-180,w:200,h:240},20))things.push({y:ent.y,ent});
    if(G.player)things.push({y:G.player.y,ent:G.player});
    for(const it of G.interactables||[])if(R.visible(cam,{x:it.x-80,y:it.y-140,w:160,h:200},40))things.push({y:it.y,it});
    for(const t of things){const o=t.ent||t.it||t.prop;ctx.shadow(o.x,o.y+6,t.ent?(o.radius||18)*3:(o.size||100)*0.72,t.ent?18:26,0.48);}
    for(const h of G.hazards||[])if(R.visible(cam,{x:h.x-150,y:h.y-150,w:300,h:300}))helpers.hazard(ctx,G,h);
    for(const f of K.E.effects||[])if(R.visible(cam,{x:f.x-180,y:f.y-180,w:360,h:360}))helpers.effect(ctx,G,f);
    things.sort((a,b)=>a.y-b.y);
    for(const t of things){if(t.ent)helpers.actor(ctx,G,t.ent);else if(t.it)helpers.interactable(ctx,G,t.it,family);else{const p=t.prop,s=p.size||100,id=p.asset||'region.'+family+'.props',entry=A.entry(id),cols=entry?.cols||4,cell=p.cell||0;ctx.save();ctx.globalAlpha=p.broken?0.25:(p.alpha||0.83);if(G.player&&Math.abs(p.x-G.player.x)<s*0.45&&p.y>G.player.y&&p.y-G.player.y<s*0.75)ctx.globalAlpha*=0.4;A.drawCell(ctx,id,cell%cols,Math.floor(cell/cols),p.x,p.y-s*0.28,s,s,{rot:p.motion?Math.sin(G.realTime*0.8+p.x)*0.025:0});ctx.restore();}}
    for(const f of K.E.telegraphs||[])helpers.effect(ctx,G,Object.assign({kind:'telegraph'},f));
    for(const p of K.E.projectiles||[])if(R.visible(cam,{x:p.x-40,y:p.y-40,w:80,h:80}))helpers.projectile(ctx,p);
    helpers.particles(ctx,G);
    for(const p of K.E.pickups||[])if(R.visible(cam,{x:p.x-40,y:p.y-40,w:80,h:80}))helpers.pickup(ctx,p,G);
    ctx.restore();helpers.banner(ctx,G);helpers.cinematic(ctx,G);
    ctx.flush();ctx.stats.frameMs=typeof performance!=='undefined'?performance.now()-started:0;
  };
})();
