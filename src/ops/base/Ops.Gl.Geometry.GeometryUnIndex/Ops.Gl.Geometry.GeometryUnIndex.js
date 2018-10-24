
var geometry=op.addInPort(new CABLES.Port(op,"Geometry",CABLES.OP_PORT_TYPE_OBJECT));
var result=op.outObject("Result");

geometry.onChange=function()
{
    var geom=geometry.get();


    if(geom)
    {
        if(!geom.isIndexed())
        {
            result.set(geom);
            return;
        }

        var newGeom=geom.copy();
        newGeom.unIndex();
        // newGeom.verticesIndices=[];
        // newGeom.calculateNormals();
        result.set(newGeom);
    }
    else
    {
        result.set(null);
    }

};