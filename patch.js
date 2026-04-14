const fs = require('fs');
const file = 'src/app/profile/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

if (!txt.includes(', signOut } from')) {
    txt = txt.replace("from 'next-auth/react';", ", signOut } from 'next-auth/react';");
}

let startIndex = txt.indexOf('const handleLogout = () => {');
if (startIndex !== -1) {
    let endIndex = txt.indexOf('};', startIndex) + 2;
    let oldFunc = txt.substring(startIndex, endIndex);
    let newFunc = 'const handleLogout = async () => {\n      await signOut({ callbackUrl: "/" });\n  };';
    txt = txt.replace(oldFunc, newFunc);
    fs.writeFileSync(file, txt);
    console.log("Success! Logout patched.");
} else {
    console.log("Error finding handleLogout!");
}
