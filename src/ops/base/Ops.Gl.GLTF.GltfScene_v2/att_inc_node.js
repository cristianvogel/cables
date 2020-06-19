
var gltfNode=class
{
    constructor(node,gltf)
    {
        this.isChild=node.isChild||false;
        this.name=node.name;
        this.hidden=false;
        this.mat=mat4.create();
        this._animMat=mat4.create();
        this._tempMat=mat4.create();
        this._tempQuat=quat.create();
        this._tempRotmat=mat4.create();
        this.mesh=null;
        this.children=[];
        this._node=node;
        this.absMat=mat4.create();


        if(node.translation) mat4.translate(this.mat,this.mat,node.translation);

        if(node.rotation)
        {
            var rotmat=mat4.create();
            this._rot=node.rotation;

            mat4.fromQuat(rotmat,node.rotation);
            mat4.mul(this.mat,this.mat,rotmat);
        }

        if(node.scale)
        {
            this._scale=node.scale;
            mat4.scale(this.mat,this.mat,this._scale);
        }

        if(node.hasOwnProperty("mesh"))
        {
            this.mesh=gltf.meshes[node.mesh];
        }

        if(node.children)
        {
            for(var i=0;i<node.children.length;i++)
            {
                gltf.json.nodes[i].isChild=true;
                if(gltf.nodes[node.children[i]]) gltf.nodes[node.children[i]].isChild=true;
                this.children.push(node.children[i]);
            }
        }
    }

    unHide()
    {
        this.hidden=false;
        for(var i=0;i<this.children.length;i++)
            if(this.children[i].unHide) this.children[i].unHide();
    }

    calcBounds(gltf,mat,bounds)
    {
        var localMat=mat4.create();
        if(mat)
        {
            mat4.copy(localMat,mat);
        }

        // mat=mat||mat4.create();

        if(this.mat)
            mat4.mul(localMat,localMat,this.mat);

        if(this.mesh)
        {
            var bb=this.mesh.bounds.copy();
            bb.mulMat4(localMat);
            bounds.apply(bb);

            boundingPoints.push(bb._min[0],bb._min[1],bb._min[2]);
            boundingPoints.push(bb._max[0],bb._max[1],bb._max[2]);
        }

        for(var i=0;i<this.children.length;i++)
        {
            if(gltf.nodes[this.children[i]] && gltf.nodes[this.children[i]].calcBounds)
            {
                bounds.apply(gltf.nodes[this.children[i]].calcBounds(gltf,localMat,bounds));
            }
        }

        if(bounds.changed)return bounds;
        else return null;
    }

    setAnim(path,anims)
    {
        if(path=="translation")this._animTrans=anims;
        else if(path=="rotation")this._animRot=anims;
        else if(path=="scale")this._animScale=anims;
        else console.warn("unknown anim path",path,anims);
    }

    modelMatAbs()
    {
        return this.absMat;
        // if(!this._animTrans) return this.mat;
        // else return this._animMat;
    }

    transform(cgl,_time)
    {
        if(!_time )_time=time;

        if(!this._animTrans)
        {
            mat4.mul(cgl.mMatrix,cgl.mMatrix,this.mat);
        }
        else
        {
            mat4.identity(this._animMat);

            var playAnims=true;

            if(playAnims && this._animTrans)
            {
                mat4.translate(this._animMat,this._animMat,[
                    this._animTrans[0].getValue(time),
                    this._animTrans[1].getValue(time),
                    this._animTrans[2].getValue(time)]);
            }
            else
            if(this.translation) mat4.translate(this._animMat,this._animMat,this.translation);

            if(playAnims && this._animRot)
            {
                CABLES.TL.Anim.slerpQuaternion(time,this._tempQuat,this._animRot[0],this._animRot[1],this._animRot[2],this._animRot[3]);

                mat4.fromQuat(this._tempMat,this._tempQuat);
                mat4.mul(this._animMat,this._animMat,this._tempMat);
            }
            else if(this._rot)
            {
                mat4.fromQuat(this._tempRotmat,this._rot);
                mat4.mul(this._animMat,this._animMat,this._tempRotmat);
            }

            if(playAnims && this._animScale)
            {
                mat4.scale(this._animMat,this._animMat,[
                    this._animScale[0].getValue(time),
                    this._animScale[1].getValue(time),
                    this._animScale[2].getValue(time)]);
            } else if(this._scale) mat4.scale(this._animMat,this._animMat,this._scale);

            mat4.mul(cgl.mMatrix,cgl.mMatrix,this._animMat);
        }
        mat4.copy(this.absMat,cgl.mMatrix);
    }

    render(cgl,dontTransform,dontDrawMesh,ignoreMaterial,ignoreChilds,drawHidden,_time)
    {
        // dontTransform,drawMesh,ignoreMaterial,
        if(this.hidden && !drawHidden) return;

        if(!dontTransform) cgl.pushModelMatrix();
        if(!dontTransform) this.transform(cgl,_time||time);

        if(this.mesh && !dontDrawMesh) this.mesh.render(cgl,ignoreMaterial);

        if(!ignoreChilds)
            for(var i=0;i<this.children.length;i++)
                if(gltf.nodes[this.children[i]])
                    gltf.nodes[this.children[i]].render(cgl,dontTransform,dontDrawMesh,ignoreMaterial,ignoreChilds,drawHidden,_time);

        if(!dontTransform)cgl.popModelMatrix();
    }

};