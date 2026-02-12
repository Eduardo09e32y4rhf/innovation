# Deploy to Render - Step by Step Guide 🚀

Congratulations! Your project is ready for deployment. Follow these steps to put `Innovation.ia` online.

## Prerequisites
1. A [GitHub Account](https://github.com/)
2. A [Render Account](https://render.com/) (Free tier works great)

## Step 1: Push Code to GitHub
Since `gh` CLI is not installed, follow these manual steps:

1.  **Create a New Repository** on GitHub (name it `innovation-ia`).
    *   Do NOT initialize with README, .gitignore, or License.
2.  **Push your local code**:
    Run the following commands in your terminal (inside the project folder):
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/innovation-ia.git
    git branch -M main
    git push -u origin main
    ```
    *(Replace `YOUR_USERNAME` with your actual GitHub username)*

## Step 2: Deploy on Render
1.  Go to your [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub account and select the `innovation-ia` repository.
4.  Render will automatically detect the `render.yaml` file configurations! 
5.  **Click "Create Web Service"**.

## Step 3: Configuration (Environment Variables)
Render will use the settings from `render.yaml`, but for a production database:

1.  **Create a PostgreSQL Database** on Render:
    *   Click **New +** -> **PostgreSQL**.
    *   Name it `innovation-db`.
    *   Copy the `Internal Database URL`.
2.  **Link Database to App**:
    *   Go to your `innovation-ia` Web Service -> **Environment**.
    *   Add a new variable:
        *   Key: `DATABASE_URL`
        *   Value: *(Paste the Internal Database URL from step 1)*
3.  **Run Migrations**:
    *   In the Web Service Shell (or as a Build Command if preferred), run:
        ```bash
        alembic upgrade head
        ```
    *   *Note: Our `startCommand` currently uses SQLite for simplicity. To use Postgres, just setting `DATABASE_URL` is usually enough if the app reads it correctly.*

## Step 4: Verify Deployment
Once the build finishes (it takes about 3-5 minutes), Render will give you a URL like `https://innovation-ia.onrender.com`.
Open it, register a company, and test the flow!

---
**Need Help?**
If the build fails, check the "Logs" tab in Render for error messages. Common issues are missing dependencies in `requirements.txt` (which we just updated!).
