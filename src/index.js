"use strict";

var dotenv;
var filter;

function getFilter(pattern) {
  if (pattern) {
    if (pattern instanceof RegExp) {
      return pattern
    }

    var normalizedPattern = pattern.replace(/^\//, '').replace(/\/$/, '');
    return new RegExp(normalizedPattern);
  }

  return /.*/
}

module.exports = function (options) {
  var t = options.types;

  return {
    visitor: {
      MemberExpression: function MemberExpression(path, state) {
        if(t.isAssignmentExpression(path.parent) && path.parent.left == path.node) return;
        if (path.get("object").matchesPattern("process.env")) {
          if (!dotenv) {
            dotenv = require('dotenv').config(state.opts);
            var dotenvExpand;
            try { dotenvExpand = require('dotenv-expand'); } catch(e) {}
            if (dotenvExpand)
              dotenvExpand(dotenv);
          }
          var key = path.toComputedKey();
          if (!filter) {
            filter = getFilter(state.opts.pattern);
          }
          if (t.isStringLiteral(key)) {
            var name = key.value;
            if (filter.test(name)) {
              var value = state.opts.env && name in state.opts.env ? state.opts.env[name] : process.env[name];
              var me = t.memberExpression;
              var i = t.identifier;
              var le = t.logicalExpression;
              var replace = state.opts.unsafe
                ? t.valueToNode(value)
                : le(
                    "||",
                    le(
                      "&&",
                      le("&&", i("process"), me(i("process"), i("env"))),
                      me(i("process.env"), i(name))
                    ),
                    t.valueToNode(value)
                  );

              path.replaceWith(replace);
            }
          }
        }
      }
    }
  };
};
