# Entry Schema Plugins
All files inside this directory will be consumed and passed to **Mongoose's
plugin Api** ([docs](5ab932a594ea120fe2848e60)). Plugins can be used to extend
the default KeyTerms schema to fit your needs. They can be used to add additional
fields, validation, or to re-purpose the banner text feature

#### Example: *Re-purpose Banner Text*

```javascript
// addition.plugin.js
module.exports = function (schema, options) {
    // define `additionalField`
    schema.add({additionalField: {type: String, uppercase: true}});
    
    // use mongoose pre hook to update bannerText field
    schema.pre('save', function (next) {
    	this.bannerText = this.additionalField;
    	
    	next();
    });
};
```