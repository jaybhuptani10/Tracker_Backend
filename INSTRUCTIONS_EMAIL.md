# How to Enable Email Notifications (Gmail)

To allow "DuoTrack" to send real emails (reminders and notifications), you need to give it permission to use your Gmail account. You cannot use your regular password; you must generate a special **App Password**.

### Step 1: Enable 2-Factor Authentication (2FA)

_Skip this if you already use 2-step verification (phone prompt/SMS code)._

1. Go to [Manage your Google Account](https://myaccount.google.com/).
2. Click **Security** on the left menu.
3. Under "How you sign in to Google", turn on **2-Step Verification**.

### Step 2: Generate an App Password

1. In the search bar at the top of the Google Account page, type **"App passwords"** and click the result.
   - _Note: If you don't see this, 2FA might not be active yet._
2. You might be asked to sign in again.
3. Currently, Google lets you create a specific name. Type **"DuoTrack"** (or any name) and click **Create**.
4. Google will show you a **16-character code** in a yellow bar (it looks like `abcd efgh ijkl mnop`).
5. **COPY THIS CODE.** You won't see it again.

### Step 3: Add to Project

1. Open the `.env` file in your `Backend` folder.
2. Add these two lines at the bottom:
   ```env
   EMAIL_USER=your_real_gmail@gmail.com
   EMAIL_PASS=paste_the_16_char_code_here
   ```
   _(Remove any spaces in the code if you want, but it usually works with them too)._

### Step 4: Restart Server

1. Go to your terminal where the backend is running.
2. Press `Ctrl + C` to stop it.
3. Run `npm run dev` again.

Now, whenever you complete a task, your friend will receive an email from you!
