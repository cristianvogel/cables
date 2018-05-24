/**
 * a framebuffer
 * @namespace CGL.Framebuffer
 * @memberof CGL
 * @constructor
 * @param {CGL.Context} cgl
 * @param {Number} width
 * @param {Number} height
 * @param {Object} [options]
 * @class
 */

var CGL=CGL || {};

CGL.Framebuffer=function(_cgl,w,h,options)
{
    var cgl=_cgl;

    var depthTextureExt = cgl.gl.getExtension('WEBGL_depth_texture') || cgl.gl.getExtension( "WEBKIT_WEBGL_depth_texture" ) || cgl.gl.getExtension( "MOZ_WEBGL_depth_texture" ) || cgl.gl.DEPTH_TEXTURE;
    if(!depthTextureExt)
    {
        cgl.exitError("NO_DEPTH_TEXTURE","no depth texture support");
        return;
    }

    var width = w || 512;
    var height = h || 512;

    options=options ||
    {
        "isFloatingPointTexture":false
    };

    var texture=new CGL.Texture(cgl,
        {
            "isFloatingPointTexture":options.isFloatingPointTexture,
            "filter":CGL.Texture.FILTER_NEAREST,
            "wrap":CGL.Texture.CLAMP_TO_EDGE
        });

    var textureDepth=null;
    if(depthTextureExt)
        textureDepth=new CGL.Texture(cgl,
            {
                "isDepthTexture":true
            });

    var frameBuf = cgl.gl.createFramebuffer();
    var depthBuffer = cgl.gl.createRenderbuffer();

    this.getWidth=function(){ return width; };
    this.getHeight=function(){ return height; };

    /**
     * get depth renderbuffer
     * @name CGL.Context#getDepthRenderBuffer
     * @returns {Object} renderbuffer
     * @function
     */
    this.getDepthRenderBuffer=function()
    {
        return depthBuffer;
    }

    /**
     * get color texture 
     * @name CGL.Context#getTextureColor
     * @returns {CGL.Texture} rgba texture
     * @function
     */
    this.getTextureColor=function()
    {
        return texture;
    };

    /**
     * get depth texture
     * @name CGL.Context#getTextureDepth
     * @returns {CGL.Texture} depth texture
     * @function
     */
    this.getTextureDepth=function()
    {
        return textureDepth;
    };

    this.setFilter=function(f)
    {
        texture.filter=f;
        texture.setSize(width,height);
    };

    this.setSize=function(w,h)
    {
        if(w<2)w=2;
        if(h<2)h=2;

        width=w;
        height=h;

        CGL.profileFrameBuffercreate++;

        cgl.gl.bindFramebuffer(cgl.gl.FRAMEBUFFER, frameBuf);
        cgl.gl.bindRenderbuffer(cgl.gl.RENDERBUFFER, depthBuffer);

        texture.setSize(width,height);
        if(textureDepth)textureDepth.setSize(width,height);

        if(depthTextureExt) cgl.gl.renderbufferStorage(cgl.gl.RENDERBUFFER, cgl.gl.DEPTH_COMPONENT16, width,height);

        cgl.gl.framebufferTexture2D(cgl.gl.FRAMEBUFFER, cgl.gl.COLOR_ATTACHMENT0, cgl.gl.TEXTURE_2D, texture.tex, 0);

        if(depthTextureExt)
        {
            // if(this._cgl.gl.getExtension('OES_texture_half_float'))
            // {
            //     console.log("halt float");HALF_FLOAT_OES
            // }
            cgl.gl.framebufferRenderbuffer(cgl.gl.FRAMEBUFFER, cgl.gl.DEPTH_ATTACHMENT, cgl.gl.RENDERBUFFER, depthBuffer);
            cgl.gl.framebufferTexture2D(
                cgl.gl.FRAMEBUFFER,
                cgl.gl.DEPTH_ATTACHMENT, // safari needs DEPTH_ATTACHMENT NOT DEPTH_ATTACHMENT16
                //cgl.gl.DEPTH_COMPONENT16,
                cgl.gl.TEXTURE_2D,
                textureDepth.tex,
                0 );
        }

        if (!cgl.gl.isFramebuffer(frameBuf)) throw("Invalid framebuffer");
        var status = cgl.gl.checkFramebufferStatus(cgl.gl.FRAMEBUFFER);
        switch (status)
        {
            case cgl.gl.FRAMEBUFFER_COMPLETE:
                break;
            case cgl.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                console.log('FRAMEBUFFER_INCOMPLETE_ATTACHMENT...',width,height,texture.tex,depthBuffer);
                throw new Error("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
            case cgl.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                console.log('FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT');
                throw new Error("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
            case cgl.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                console.log('FRAMEBUFFER_INCOMPLETE_DIMENSIONS');
                throw new Error("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
            case cgl.gl.FRAMEBUFFER_UNSUPPORTED:
                console.log('FRAMEBUFFER_UNSUPPORTED');
                throw new Error("Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED");
            default:
                console.log('incomplete framebuffer',status);
                throw new Error("Incomplete framebuffer: " + status);
                // throw("Incomplete framebuffer: " + status);
        }

        cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, null);
        cgl.gl.bindRenderbuffer(cgl.gl.RENDERBUFFER, null);
        cgl.gl.bindFramebuffer(cgl.gl.FRAMEBUFFER, null);
    };

    this.renderStart=function()
    {
        cgl.pushModelMatrix();
        cgl.gl.bindFramebuffer(cgl.gl.FRAMEBUFFER, frameBuf);
        cgl.pushFrameBuffer(frameBuf);

        cgl.pushPMatrix();
        cgl.gl.viewport(0, 0, width,height );

        cgl.gl.clearColor(0,0,0,0);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    };

    this.renderEnd=function()
    {
        cgl.popPMatrix();
        cgl.gl.bindFramebuffer(cgl.gl.FRAMEBUFFER, cgl.popFrameBuffer() );

        cgl.popModelMatrix();
        cgl.resetViewPort();
    };

    this.delete=function()
    {
        texture.delete();
        if(textureDepth)textureDepth.delete();
        cgl.gl.deleteRenderbuffer(depthBuffer);
        cgl.gl.deleteFramebuffer(frameBuf);
    };

    this.setSize(width,height);
};
