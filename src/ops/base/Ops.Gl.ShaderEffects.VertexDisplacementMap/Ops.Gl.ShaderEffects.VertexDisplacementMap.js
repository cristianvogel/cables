const cgl=op.patch.cgl;
var id='mod'+Math.floor(Math.random()*10000);

op.render=op.inTrigger("render");
op.trigger=op.outTrigger("trigger");
var texture=op.inTexture("texture");
var extrude=op.inValue("extrude",0.5);

var flip=op.inValueBool("flip",true);

var removeZero=op.inValueBool("Ignore Zero Values");
var invert=op.inValueBool("invert");
var offsetX=op.inValueFloat("offset X");
var offsetY=op.inValueFloat("offset Y");

var colorize=op.inValueBool("colorize");
var colorizeAdd=op.inValueSlider("colorize add");
var meth=op.inValueSelect("mode",['normal','mul xyz','add z','add y','mul y','sub z']);

colorize.set(false);

function updateColorize()
{
    if(shader)
        if(colorize.get()) shader.define(id+'HEIGHTMAP_COLORIZE');
            else shader.removeDefine(id+'HEIGHTMAP_COLORIZE');
}

function updateInvert()
{
    if(shader)
        if(invert.get()) shader.define(id+'HEIGHTMAP_INVERT');
            else shader.removeDefine(id+'HEIGHTMAP_INVERT');
}

colorize.onChange=updateColorize;
invert.onChange=updateInvert;
removeZero.onChange=updateRemoveZero;

function updateRemoveZero()
{
    if(shader)
        if(removeZero.get()) shader.define(id+'DISPLACE_REMOVE_ZERO');
            else shader.removeDefine(id+'DISPLACE_REMOVE_ZERO');
}

var updateMethod=function()
{
    if(shader)
    {
        if(flip.get()) shader.define(id+'FLIPY');
            else shader.removeDefine(id+'FLIPY');

        shader.removeDefine(id+'DISPLACE_METH_MULXYZ');
        shader.removeDefine(id+'DISPLACE_METH_ADDZ');
        shader.removeDefine(id+'DISPLACE_METH_ADDY');
        shader.removeDefine(id+'DISPLACE_METH_MULY');
        shader.removeDefine(id+'DISPLACE_METH_NORMAL');

        if(meth.get()=='mul xyz') shader.define(id+'DISPLACE_METH_MULXYZ');
        if(meth.get()=='add z') shader.define(id+'DISPLACE_METH_ADDZ');
        if(meth.get()=='add y') shader.define(id+'DISPLACE_METH_ADDY');
        if(meth.get()=='mul y') shader.define(id+'DISPLACE_METH_MULY');
        if(meth.get()=='normal') shader.define(id+'DISPLACE_METH_NORMAL');

        updateRemoveZero();
    }
};

flip.onChange=updateMethod;
meth.onChange=updateMethod;
meth.set('normal');

var shader=null;
var uniExtrude,uniTexture;


var srcHeadVert=''
    .endl()+'UNI float {{mod}}_extrude;'
    .endl()+'UNI sampler2D {{mod}}_texture;'
    .endl()+'UNI float {{mod}}_offsetX;'
    .endl()+'UNI float {{mod}}_offsetY;'

    .endl()+'OUT float '+id+'displHeightMapColor;'
    .endl();

var srcBodyVert=''


    .endl()+'vec2 {{mod}}tc=texCoord;'
    // .endl()+'vec2 {{mod}}tc=vec2(pos.x,pos.y);'

    .endl()+'#ifdef '+id+'FLIPY'
    .endl()+'    {{mod}}tc.y=1.0-{{mod}}tc.y;'
    .endl()+'#endif'


    .endl()+'float {{mod}}_texVal=texture2D( {{mod}}_texture, vec2({{mod}}tc.x+{{mod}}_offsetX,{{mod}}tc.y+{{mod}}_offsetY) ).b;'

    .endl()+'#ifdef '+id+'HEIGHTMAP_INVERT'
    .endl()+'{{mod}}_texVal=1.0-{{mod}}_texVal;'
    .endl()+'#endif'

    .endl()+'#ifdef '+id+'DISPLACE_METH_MULXYZ'
    .endl()+'   {{mod}}_texVal+=1.0;'
    .endl()+'   pos.xyz *= {{mod}}_texVal * {{mod}}_extrude;'
    // .endl()+'   norm=normalize(norm+normalize(pos.xyz+vec3({{mod}}_texVal)* {{mod}}_extrude));'
    .endl()+'#endif'

    .endl()+'#ifdef '+id+'DISPLACE_METH_ADDZ'
    .endl()+'   pos.z+=({{mod}}_texVal * {{mod}}_extrude);'
    .endl()+'#endif'

    .endl()+'#ifdef '+id+'DISPLACE_METH_ADDY'
    .endl()+'   pos.y+=({{mod}}_texVal * {{mod}}_extrude);'
    // .endl()+'norm=normalize(norm+normalize(vec3(0.0,0.0+({{mod}}_texVal ),0.0)));'
    .endl()+'#endif'


    .endl()+'#ifdef '+id+'DISPLACE_METH_MULY'
    .endl()+'   pos.y+=(({{mod}}_texVal-0.5) * {{mod}}_extrude);'
    .endl()+'#endif'

    .endl()+'#ifdef '+id+'DISPLACE_METH_NORMAL'
    .endl()+'   pos.xyz+=norm*{{mod}}_texVal*{{mod}}_extrude;'
    .endl()+'#endif'


    .endl()+''+id+'displHeightMapColor={{mod}}_texVal;'

    .endl();

var srcHeadFrag=''
    .endl()+'UNI float {{mod}}_colorizeAdd;'
    .endl()+'IN float '+id+'displHeightMapColor;'
    .endl()+'UNI sampler2D {{mod}}_texture;'
    // .endl()+'IN vec3 vViewPosition;'

    .endl();

var srcBodyFrag=''

    .endl()+'#ifdef '+id+'HEIGHTMAP_COLORIZE'
    .endl()+'   col.rgb*='+id+'displHeightMapColor*(1.0-{{mod}}_colorizeAdd);'
    .endl()+'   col+={{mod}}_colorizeAdd;'
    .endl()+'#endif'

    .endl()+'#ifdef '+id+'DISPLACE_REMOVE_ZERO'
    .endl()+'if('+id+'displHeightMapColor==0.0)discard;'
    .endl()+'#endif'
    .endl();


var moduleFrag=null;
var moduleVert=null;

function removeModule()
{
    if(shader && moduleFrag) shader.removeModule(moduleFrag);
    if(shader && moduleVert) shader.removeModule(moduleVert);
    shader=null;
}


var uniTexture=null;
var uniTextureFrag=null;
var uniExtrude=null;
var uniOffsetX=null;
var uniOffsetY=null;
var uniColorizeAdd=null;

op.render.onLinkChanged=removeModule;

op.render.onTriggered=function()
{
    if(!cgl.getShader())
    {
         op.trigger.trigger();
         return;
    }


    if(cgl.getShader()!=shader)
    {
        if(shader) removeModule();


        // console.log('re init shader module vertexdisplacement');

        shader=cgl.getShader();


        moduleVert=shader.addModule(
            {
                title:op.objName,
                name:'MODULE_VERTEX_POSITION',
                srcHeadVert:srcHeadVert,
                srcBodyVert:srcBodyVert
            });

        uniTexture=new CGL.Uniform(shader,'t',moduleVert.prefix+'_texture',0);
        uniExtrude=new CGL.Uniform(shader,'f',moduleVert.prefix+'_extrude',extrude);
        uniOffsetX=new CGL.Uniform(shader,'f',moduleVert.prefix+'_offsetX',offsetX);
        uniOffsetY=new CGL.Uniform(shader,'f',moduleVert.prefix+'_offsetY',offsetY);

        moduleFrag=shader.addModule(
            {
                title:op.objName,
                name:'MODULE_COLOR',
                srcHeadFrag:srcHeadFrag,
                srcBodyFrag:srcBodyFrag
            });
        uniTextureFrag=new CGL.Uniform(shader,'t',moduleFrag.prefix+'_texture',0);
        uniColorizeAdd=new CGL.Uniform(shader,'f',moduleFrag.prefix+'_colorizeAdd',colorizeAdd);

        updateMethod();
        updateInvert();
        updateColorize();
    }


    if(!shader)return;
    var texSlot=moduleVert.num+5;

    if(texture.get())
    {
        uniTexture.setValue(texSlot);
        uniTextureFrag.setValue(texSlot);

        cgl.setTexture(0+texSlot,texture.get().tex);
        // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, texture.get().tex);
    }

    op.trigger.trigger();
};
