const regl = require('regl')({
  // extensions:['OES_texture_float']
});
const mouse = require('mouse-change')();

const pixels = regl.texture({
  // type:'float32'
});

const drawFeedback = regl({
  frag: `
  precision mediump float;
  uniform sampler2D texture;
  uniform vec2 mouse;
  uniform float t;
  uniform vec2 size;
  const float pi = 3.14159;
  vec3 samp(vec2 p){
    return texture2D(texture, fract(p/size)).rgb;
  }
  vec3 fourpt(vec2 uv, float d){
    const vec3 p = vec3(1.,-1.,0.);
    vec3 e = samp(uv+d*p.zx);
    vec3 w = samp(uv+d*p.zy);
    vec3 n = samp(uv+d*p.xz);
    vec3 s = samp(uv+d*p.yz);
    vec3 mu = (e+s+n+w)/4.;
    vec3 d_e = (e-mu)*(e-mu);
    vec3 d_w = (w-mu)*(w-mu);
    vec3 d_n = (n-mu)*(n-mu);
    vec3 d_s = (s-mu)*(s-mu);
    vec3 sigma = sqrt(d_e+d_w+d_n+d_s)/2.;
    // return mu.gbr/(1.+sigma);
    // return mu.gbr*(1.+sigma);
    // return mu.gbr*(sigma.r-sigma.g+sigma.b+1.);
    // return (mu/(sigma.gbr+1.)).gbr;
    return ((samp(uv)-mu)*(sigma.gbr+.5)+mu).gbr;
  }
  vec3 eightpt(vec2 uv, float d){
    const vec3 p = vec3(1.,-1.,0.);
    vec3 e = samp(uv+d*p.zx);
    vec3 w = samp(uv+d*p.zy);
    vec3 n = samp(uv+d*p.xz);
    vec3 s = samp(uv+d*p.yz);
    vec3 ne = samp(uv+d*p.xx);
    vec3 nw = samp(uv+d*p.xy);
    vec3 se = samp(uv+d*p.yx);
    vec3 sw = samp(uv+d*p.yy);
    vec3 mu = (e+s+n+w+ne+nw+se+sw)/8.;
    vec3 d_e = (e-mu)*(e-mu);
    vec3 d_w = (w-mu)*(w-mu);
    vec3 d_n = (n-mu)*(n-mu);
    vec3 d_s = (s-mu)*(s-mu);
    vec3 d_ne = (ne-mu)*(ne-mu);
    vec3 d_nw = (nw-mu)*(nw-mu);
    vec3 d_se = (se-mu)*(se-mu);
    vec3 d_sw = (sw-mu)*(sw-mu);
    vec3 sigma = sqrt((d_e+d_w+d_n+d_s+d_ne+d_nw+d_se+d_sw)/7.);
    return mu.gbr/(1.+sigma);
  }
  vec3 ninept(vec2 uv, float d){
    const vec3 p = vec3(1.,-1.,0.);
    vec3 c = samp(uv);
    vec3 e = samp(uv+d*p.zx);
    vec3 w = samp(uv+d*p.zy);
    vec3 n = samp(uv+d*p.xz);
    vec3 s = samp(uv+d*p.yz);
    vec3 ne = samp(uv+d*p.xx);
    vec3 nw = samp(uv+d*p.xy);
    vec3 se = samp(uv+d*p.yx);
    vec3 sw = samp(uv+d*p.yy);
    vec3 mu = (e+s+n+w+ne+nw+se+sw+c)/9.;
    vec3 d_c = (c-mu)*(c-mu);
    vec3 d_e = (e-mu)*(e-mu);
    vec3 d_w = (w-mu)*(w-mu);
    vec3 d_n = (n-mu)*(n-mu);
    vec3 d_s = (s-mu)*(s-mu);
    vec3 d_ne = (ne-mu)*(ne-mu);
    vec3 d_nw = (nw-mu)*(nw-mu);
    vec3 d_se = (se-mu)*(se-mu);
    vec3 d_sw = (sw-mu)*(sw-mu);
    vec3 sigma = sqrt((d_e+d_w+d_n+d_s+d_ne+d_nw+d_se+d_sw+d_c)/8.);
    return mu.gbr/(1.+sigma);
  }
  vec3 color_normalize(vec3 x){
    x -= (x.r+x.g+x.b)/3.;
    x /= length(x) + 0.001;
    return (x+1.)*0.5;
  }
  vec3 color_min2max(vec3 x){
    // (for nonnegative x) adds min to max channel and zeros min channel
    for(int i=0;i<3;i++){
      if(x.r > x.g && x.r > x.b){
        if(x.g < x.b){
          x.r += x.g;
          x.g = 0.;
        } else {
          x.r += x.b;
          x.b = 0.;
        }
      }
      x = x.grb;
    }
    return x;
  }
  vec3 color_max2min(vec3 x){
    // (for nonnegative x) adds max to min channel and zeros max channel
    vec3 t = x;
    for(int i=0;i<3;i++){
      if(t.r > t.g && t.r > t.b){
        if(t.g < t.b){
          x.g+=x.r;
          x.r=0.;
        } else {
          x.b+=x.r;
          x.r=0.;
        }
      }
      x = x.grb;
      t = t.grb;
    }
    return x;
  }
  vec3 color_mid2max(vec3 x){
    // (for nonnegative x) adds mid to max channel and zeros mid channel
    vec3 t = x;
    for(int i=0;i<3;i++){
      if(t.r > t.g && t.r > t.b){
        if(t.g < t.b){
          x.r+=x.b;
          x.b=0.;
        } else {
          x.r+=x.g;
          x.g=0.;
        }
      }
      x = x.grb;
      t = t.grb;
    }
    return x;
  }
  vec3 color_mid2min_broken(vec3 x){
    // (for nonnegative x) adds mid to max channel and zeros mid channel
    for(int i=0;i<3;i++){
      if(x.r > x.g && x.r > x.b){
        if(x.g < x.b){
          x.g+=x.b;
          x.b=0.;
        } else {
          x.b+=x.g;
          x.g=0.;
        }
      }
      x = x.grb;
    }
    return x;
  }
  vec3 color_mid2min(vec3 x){
    // (for nonnegative x) adds mid to max channel and zeros mid channel
    vec3 t = x;
    for(int i=0;i<3;i++){
      if(t.r > t.g && t.r > t.b){
        if(t.g < t.b){
          x.g+=x.b;
          x.b=0.;
        } else {
          x.b+=x.g;
          x.g=0.;
        }
      }
      x = x.grb;
      t = t.grb;
    }
    return x;
  }
  void main () {
    float ff = 1.75; //
    float fb = -1.; //
    float fsv = 0.05; //0.05; //
    float m = 0.005; //0.1; //
    float octaves = (1.-cos(pi*t/100.))*1.;//1.;
    vec2 uv = gl_FragCoord.xy;
    vec3 sv = sin(vec3(1.,2.,1.)*pi*uv.yyx/size.yyx)-1.;
    vec3 c = vec3(0.);//(sv*.5+1.)*1.;
    if (t>.5){
      vec3 c0 = samp(uv);
      vec3 c1 = samp(uv+=pow(2.,c0.r*octaves)*cos(2.*pi*vec2(c0.g, c0.g+0.25)));
      // c = ninept(uv, pow(2., c1.b*octaves));
      c = fourpt(uv, pow(2., c1.b*octaves));
      c = fract(ff*c + fb*c1 + fsv*sv);
      c = color_mid2min_broken(c);
      // c = color_mid2min(c);
      // c = color_normalize(c);
      c = mix(c1, c, m);
    }
    gl_FragColor = vec4(c, 1.);
  }`,

  vert: `
  precision mediump float;
  attribute vec2 position;
  void main () {
    gl_Position = vec4(2.0 * position - 1.0, 0, 1);
  }`,

  attributes: {
    position: [
      -2, 0,
      0, -2,
      2, 2]
  },

  uniforms: {
    texture: pixels,
    mouse: ({pixelRatio, viewportHeight}) => [
      mouse.x * pixelRatio,
      viewportHeight - mouse.y * pixelRatio
    ],
    t: ({tick}) => 0.01 * tick,
    size: (context) => [context.viewportWidth, context.viewportHeight]
  },

  count: 3
});

regl.frame(function () {
  regl.clear({
    color: [0, 0, 0, 1]
  })

  drawFeedback()

  pixels({
    copy: true
  })
});
