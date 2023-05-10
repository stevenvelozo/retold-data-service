const MaterialData = require(`./Materials.json`);
const PayItemData = require(`./PayItems.json`);

for (let i = 0; i < PayItemData.length; i++)
{
    console.log(`Pay Item [${PayItemData[i].ItemCode}] [${PayItemData[i].Name}]`);
}

