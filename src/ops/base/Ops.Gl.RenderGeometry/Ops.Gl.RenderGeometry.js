const
    render = op.inTrigger("render"),
    geometry = op.inObject("Geometry", null, "geometry"),
    updateAll = op.inBool("Update All", true),
    updateFaces = op.inBool("Update Face Indices", false),
    updateVerts = op.inBool("Update Vertices", false),
    updateTexcoords = op.inBool("Update Texcoords", false),
    vertNums = op.inBool("Vertex Numbers", true),
    trigger = op.outTrigger("trigger");

geometry.ignoreValueSerialize = true;

vertNums.onChange =
    geometry.onChange = update;

let mesh = null;

render.onTriggered = function ()
{
    if (mesh) mesh.render(op.patch.cgl.getShader());
    trigger.trigger();
};

function update()
{
    const geom = geometry.get();
    if (geom && geom instanceof CGL.Geometry)
    {
        // console.log(geom);
        if (mesh)
        {
            mesh.dispose();
            mesh = null;
        }
        if (!mesh)
        {
            mesh = new CGL.Mesh(op.patch.cgl, geom);
            mesh.addVertexNumbers = vertNums.get();
            mesh.setGeom(geom);
        }

        if (updateFaces.get() || updateAll.get())
            mesh.setVertexIndices(geom.verticesIndices);

        if (updateTexcoords.get() || updateAll.get())
            mesh.updateTexCoords(geom);

        if (updateVerts.get() || updateAll.get())
            mesh.updateVertices(geom);

        mesh.addVertexNumbers = vertNums.get();

        if (updateAll.get())
        {
            if (geom.hasOwnProperty("tangents") && geom.tangents && geom.tangents.length > 0) mesh.setAttribute("attrTangent", geom.tangents, 3);
            if (geom.hasOwnProperty("biTangents") && geom.biTangents && geom.biTangents.length > 0) mesh.setAttribute("attrBiTangent", geom.biTangents, 3);
        }
    }
    else
    {
        mesh = null;
    }
}
