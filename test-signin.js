async function run() {
    try {
        const res = await fetch('http://localhost:3000/api/auth/sign-in/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:5173'
            },
            body: JSON.stringify({
                email: 'testxyz@admin.com',
                password: 'password123',
            }),
        });

        const data = await res.json();
        console.log('STATUS:', res.status);
        console.log('DATA:', data);
    } catch (e) {
        console.error('FETCH ERROR:', e);
    }
}

run();
