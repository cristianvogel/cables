const inNum = op.inFloat("Number", 0);
const outNum = op.outNumber("Result");

op.setUiAttrib({ "widthOnlyGrow": true });

inNum.onChange = () =>
{
    let n = inNum.get();
    if (op.patch.isEditorMode())
    {
        let str = "";
        if (n === null)str = "null";
        else if (n === undefined)str = "undefined";
        else
        {
            str = Math.round(n * 10000) / 10000;
            if (str[0] != "-")str = " " + str;
        }
        op.setTitle(str);
    }

    outNum.set(inNum.get());
};
