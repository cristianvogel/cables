//https://www.shadertoy.com/view/XdlGz8 ??
//http://stackoverflow.com/questions/17528878/compute-normals-from-displacement-map-in-three-js-r-58

CABLES.Op.apply(this, arguments);
var self=this;
var cgl=self.patch.cgl;

this.name='VertexDisplacementMap';
this.render=this.addInPort(new Port(this,"render",OP_PORT_TYPE_FUNCTION));
this.trigger=this.addOutPort(new Port(this,"trigger",OP_PORT_TYPE_FUNCTION));

this.texture=this.addInPort(new Port(this,"texture",OP_PORT_TYPE_TEXTURE));
this.extrude=this.addInPort(new Port(this,"extrude",OP_PORT_TYPE_VALUE));

var flip=this.addInPort(new Port(this,"flip",OP_PORT_TYPE_VALUE,{display:'bool'}));

var invert=this.addInPort(new Port(this,"invert",OP_PORT_TYPE_VALUE,{display:'bool'}));
invert.onValueChange(function()
{
    if(shader)
        if(invert.get()) shader.define('HEIGHTMAP_INVERT');
            else shader.removeDefine('HEIGHTMAP_INVERT');
});

this.extrude.onValueChanged=function(){ if(uniExtrude)uniExtrude.setValue(self.extrude.val); };

var meth=this.addInPort(new Port(this,"mode",OP_PORT_TYPE_VALUE,{display:'dropdown',
    values:['mul xyz','add z','add y','sub z']}));
    

var updateMethod=function()
{
    if(shader)
    {
        if(flip.get()) shader.define('FLIPY');
            else shader.removeDefine('FLIPY');
            
        shader.removeDefine('DISPLACE_METH_MULXYZ');
        shader.removeDefine('DISPLACE_METH_ADDZ');
        shader.removeDefine('DISPLACE_METH_ADDY');
    
        if(meth.get()=='mul xyz') shader.define('DISPLACE_METH_MULXYZ');
        if(meth.get()=='add z') shader.define('DISPLACE_METH_ADDZ');
        if(meth.get()=='add y') shader.define('DISPLACE_METH_ADDY');
    }
};

flip.onValueChange(updateMethod);
meth.onValueChange(updateMethod);
meth.set('mul xyz');

var shader=null;
var uniExtrude,uniTexture;

var srcHeadVert=''
    .endl()+'uniform float {{mod}}_extrude;'
    .endl()+'uniform sampler2D {{mod}}_texture;'
    .endl();

var srcBodyVert=''



    .endl()+'vec2 tc=texCoord;'
    .endl()+'#ifdef FLIPY'
    .endl()+'    tc.y=1.0-tc.y;'
    .endl()+'#endif'


    .endl()+'float {{mod}}_texVal=texture2D( {{mod}}_texture, tc ).b;'

    .endl()+'#ifdef HEIGHTMAP_INVERT'
    .endl()+'{{mod}}_texVal=1.0-{{mod}}_texVal;'
    .endl()+'#endif'

    .endl()+'#ifdef DISPLACE_METH_MULXYZ'
    .endl()+'   {{mod}}_texVal+=1.0;'
    .endl()+'   pos.xyz*={{mod}}_texVal * {{mod}}_extrude;'
    .endl()+'#endif'
    
    .endl()+'#ifdef DISPLACE_METH_ADDZ'
    .endl()+'       pos.z += ( {{mod}}_texVal * {{mod}}_extrude);'
    .endl()+'#endif'
    
    .endl()+'#ifdef DISPLACE_METH_ADDY'
    .endl()+'       pos.y += ( {{mod}}_texVal * {{mod}}_extrude);'
    .endl()+'#endif'
    .endl();

var srcHeadFrag=''
    .endl()+'uniform sampler2D {{mod}}_texture;'
    .endl();

var srcBodyFrag=''
    .endl()+'float colHeight=texture2D( {{mod}}_texture, texCoord ).r;'
    .endl()+'if(colHeight==0.0)col.a=0.0;'
    .endl();

var module=null;

function removeModule()
{
    if(shader && module)
    {
        shader.removeModule(module);
        shader=null;
    }
}

this.render.onLinkChanged=removeModule;

this.render.onTriggered=function()
{
    if(cgl.getShader()!=shader)
    {
        if(shader) removeModule();
        
        console.log('re init shader module vertexdisplacement')
        
        shader=cgl.getShader();

        module=shader.addModule(
            {
                name:'MODULE_VERTEX_POSITION',
                srcHeadVert:srcHeadVert,
                srcBodyVert:srcBodyVert
            });

        updateMethod();
        
        if(invert.get()) shader.define('HEIGHTMAP_INVERT');
            else shader.removeDefine('HEIGHTMAP_INVERT');

        uniTexture=new CGL.Uniform(shader,'t',module.prefix+'_texture',4);
        uniExtrude=new CGL.Uniform(shader,'f',module.prefix+'_extrude',self.extrude.val);

        module=shader.addModule(
            {
                name:'MODULE_COLOR',
                srcHeadFrag:srcHeadFrag,
                srcBodyFrag:srcBodyFrag
            });

        uniTexture=new CGL.Uniform(shader,'t',module.prefix+'_texture',4);

    }

    if(self.texture.val)
    {
        cgl.gl.activeTexture(cgl.gl.TEXTURE4);
        cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, self.texture.val.tex);
    }

    self.trigger.trigger();
};