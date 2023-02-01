IN vec2 texCoord;
IN vec4 posi;

UNI sampler2D texOldPos;
UNI sampler2D texSpawnPos;
UNI sampler2D texTiming;

UNI sampler2D texFeedbackVel;
UNI sampler2D texSpawnVel;
UNI sampler2D texVelocity;

UNI vec2 mass;
UNI float reset;
UNI vec4 paramsTime;

UNI vec3 scale;
UNI vec3 gravity;

UNI vec2 lifeTime;


UNI vec4 velocity; // xyz: xyz  / w: inherit velocity


UNI float spread;

vec3 outOfScreenPos=vec3(999999.0);

{{MODULES_HEAD}}
{{CGL.RANDOM_LOW}}

void main()
{
    vec4 oldPos=texture(texOldPos,texCoord);
    vec4 vtiming=texture(texTiming,texCoord);
    vec4 velocityTex=texture(texVelocity,texCoord);
    vec4 oldVelocity=texture(texFeedbackVel,texCoord);
    vec4 newPos=oldPos;


    float time=paramsTime.x;
    float timeDiff=paramsTime.y;
    float spawnRate=paramsTime.z;




    // respawn!!
    if(
            #ifdef RESPAWN
                time>vtiming.g
            #endif

            || isnan(vtiming.r)
            || isnan(vtiming.g)
            || reset==1.0 )
    {
        if(cgl_random(texCoord*23.123)>spawnRate )
        {
            timeDiff=0.001;
            newPos.rgb=outOfScreenPos;
        }
        else
        {
            velocityTex.rgb=vec3(0.0);


            newPos.rgb=posi.rgb;
            vec3 rnd=(cgl_random3(texCoord+gl_FragCoord.x/gl_FragCoord.y+time));

            rnd=texture(texSpawnPos,rnd.xy).rgb;

            oldVelocity=texture(texSpawnVel,texCoord);

            newPos.rgb+=rnd;

            vtiming.r=time;

            vtiming.g=(cgl_random(time*texCoord)*(lifeTime.y-lifeTime.x))+lifeTime.x+time;

            if(reset==1.0)
                vtiming.g=time+cgl_random(time*texCoord)*lifeTime.y;

        }
    }


    vtiming.a=1.0;

    float lifeProgress=( (time-vtiming.r) / (vtiming.g-vtiming.r));

    float m=mass.x+mass.y*cgl_random(texCoord);

    vec3 grav=gravity*m*(time-vtiming.r);

    newPos.rgb+=grav*timeDiff;
    newPos.rgb+=(velocity.xyz+velocityTex.xyz)*timeDiff;

    newPos.rgb-=((1.0-lifeProgress)*timeDiff*velocity.w)*oldVelocity.rgb;


    // if(isinf(newPos.r))vtiming.r=57.1;
    // if(isnan(newPos.g))newPos.g=57.2;
    if(isnan(newPos.r))newPos.rgb=outOfScreenPos;


    // gl_Position
    // r:x
    // g:y
    // b:z
    outColor0=vec4(newPos.rgb,1.0);

    // timing
    // r: starttime
    // g: endtime
    outColor1=vtiming;

    // timing output
    // r: life progress
    outColor2=vec4(vec3(lifeProgress ),1.);

    // velocity
    // oldVelocity.rgb*=1.995;
    outColor3=velocityTex+velocity;


}



