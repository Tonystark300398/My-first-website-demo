# Stark Video AI - API Setup Guide

## Getting Started with AI Video Generation

This website now integrates with **ThankYou AI's Kling API** to generate real AI videos from text prompts.

### Step 1: Get Your Free API Key

1. Visit [thankyouai.com](https://thankyouai.com)
2. Sign up for a free account
3. Navigate to the Developer Dashboard
4. Generate your API key
5. Copy the API key

### Step 2: Configure the Website

**Option A: Via Settings UI (Recommended)**
1. Open the website in your browser
2. Click the "Settings" button in the top navigation
3. Paste your API key in the settings modal
4. Select your preferred model (Kling v3 Standard is recommended for free tier)
5. Click "Save Settings"

**Option B: Via Code**
1. Open `script.js`
2. Find the `API_CONFIG` section at the top
3. Replace the empty string with your API key:
```javascript
const API_CONFIG = {
    API_KEY: 'your-api-key-here', // Paste your key here
    // ... other config
};
```

**Option C: Demo Mode (No API Key Required)**
1. Click the "Settings" button
2. Check the "Demo Mode" checkbox
3. Click "Save Settings"
4. Generate videos using placeholder videos (no credits needed!)

### Step 3: Generate Your First Video

1. Enter a detailed description in the text area
   - Example: "A panda eating bamboo on a mountain in the early morning with sunlight shining through mist"
2. Select your preferred video style (Realistic, Anime, Cinematic, etc.)
3. Choose video length (5-30 seconds)
4. Select aspect ratio (16:9 for widescreen, 9:16 for vertical)
5. Click "Generate Video with Stark AI"
6. Wait for the generation to complete (typically 30-60 seconds)
7. Your video will appear in the output section!

### Supported Models

- **Kling v3 Standard** - Best balance of quality and speed (recommended)
- **Kling v3 Pro** - Higher quality, longer generation time
- **Kling O1** - Alternative model with different style

### Pricing

ThankYou AI offers:
- **Free tier** with credits to get started
- **Pay-per-use** based on video duration
- No credit card required for free tier

**Credit Costs:**
- Video generation typically costs 60-90 credits per video
- Shorter videos (5s) cost fewer credits
- Standard mode costs less than Pro mode
- Check the [pricing page](https://thankyouai.com/developer/docs/model-apis/pricing) for details

**Adding Credits:**
1. Go to [thankyouai.com/dashboard](https://thankyouai.com/dashboard)
2. Navigate to Billing or Credits section
3. Choose a credit pack or subscription plan
4. Complete payment
5. Credits are added instantly

### Features

✅ Text-to-video generation
✅ Multiple aspect ratios (16:9, 9:16, 1:1, 4:5)
✅ Adjustable video duration (5-30 seconds)
✅ Multiple video styles
✅ Audio generation enabled
✅ Real-time progress tracking
✅ Download generated videos
✅ Share videos via link
✅ **Demo Mode** - Test the UI without API key or credits!

### Troubleshooting

**"API key not configured" error:**
- Make sure you've saved your API key in the settings
- Refresh the page after saving settings
- Or enable Demo Mode to test without an API key

**"Insufficient credits" error:**
- Add credits at [thankyouai.com/dashboard](https://thankyouai.com/dashboard)
- Try a shorter video (5 seconds instead of 10+)
- Enable Demo Mode to test the UI without spending credits
- Use Standard mode instead of Pro mode

**Generation fails:**
- Check your API key is valid
- Ensure you have enough credits in your ThankYou AI account
- Try a shorter prompt or different settings
- Check the browser console (F12) for detailed error messages

**Video doesn't play:**
- Some browsers block autoplay - click the play button manually
- Check if the video URL is valid in the console (F12)
- In Demo Mode, videos are placeholders from external sources

### API Reference

For more details on the API, visit:
- [ThankYou AI Documentation](https://thankyouai.com/developer/docs/kling-compat/text-to-video)
- [Kling API Reference](https://thankyouai.com/developer/docs)

### Need Help?

- Check the browser console (F12) for error messages
- Visit ThankYou AI's support documentation
- Ensure your internet connection is stable

---

**Note:** This is a frontend integration. For production use, consider implementing:
- Backend proxy to hide API keys
- Rate limiting
- User authentication
- Credit management system
