Image Classification App

A simple AI-powered image skin classification app built using a pretrained ResNet-18 model. The frontend connects to a Google Colab backend via ngrok, allowing you to interact with the model without installing PyTorch locally.

This app is designed to demonstrate AI in action, letting users upload images and see real-time skin classifications. 

Features:

- Upload an image and get a predicted class (for this project, we only have 3: acne, eczema, and normal).
- Utilized pretrained ResNet-18 for high accuracy.
- Lightweight and easy to use via a web interface.
- No local installation of PyTorch required because everything runs on Colab.

How It Works:

1- Frontend:  
   Built with HTML/JS, allows users to upload images.
2- Backend:  
   Runs in Google Colab:
   - Hosts the model
   - Returns predictions
3- Ngrok:  
   Creates a temporary public URL so the frontend can communicate with the Colab server in real-time.

URL: https://skinscan-ai-delta.vercel.app/
