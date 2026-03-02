async function run() {
    try {
        const res = await fetch('http://localhost:3000/api/auth/sign-up/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:5173'
            },
            body: JSON.stringify({
                name: 'Test Setup',
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
