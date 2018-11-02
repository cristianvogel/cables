IN vec2 texCoord;
UNI sampler2D tex;

UNI float amount;
UNI float numX;
UNI float numY;
UNI float addX;
UNI float addY;
UNI float addZ;

float random(vec2 co)
{
   return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * (437511.5453+addZ));
}

{{BLENDCODE}}

void main()
{
   vec2 seed=vec2(floor( texCoord.x*numX+addX),floor( texCoord.y*numY+addY));

   float r=random( seed );
   vec4 rnd=vec4( r,r,r,1.0 );
   vec4 base=texture2D(tex,texCoord);

   vec4 col=vec4( _blend(base.rgb,rnd.rgb) ,1.0);
   col=vec4( mix( col.rgb, base.rgb ,1.0-base.a*amount),1.0);

   outColor= col;
}