module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "globals": {
        "CHECK": true,
        "NODE": true,
        "PDF_JS_HASH": true,
        "Prism": true,
        "Self": true,
        "TIM": true,
        "WeakRef": true,
        "def": true,
        "pass": true,
        "root": true,
        "tim": true
    },
    "parserOptions": {
        "ecmaVersion": 2020
    },
    "rules": {
        "eol-last": "error",
        "indent": [
            "off",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "no-console": "off",
        "no-constant-condition": "off",
        "no-empty": [ "error", { "allowEmptyCatch": true } ],
        "no-trailing-spaces": "error",
        "no-unused-vars": [
            "error",
            {
                "args" : "none"
            },
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};
