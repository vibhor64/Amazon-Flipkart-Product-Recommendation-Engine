from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import markdown

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins; modify this to restrict to specific origins if needed
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods; you might want to restrict this
    allow_headers=["*"],  # Allows all headers
)

GOOGLE_API_KEY=''
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-pro')

class StringInput(BaseModel):
    prompt: str

@app.post("/fetchAmazon")
async def fetch_amazon(input: StringInput):
    LLMOut = model.generate_content(input.prompt)
    print("LLM OUTPUT: ", LLMOut.text)
    res=markdown.markdown(LLMOut.text, extensions=['markdown.extensions.tables'])
    print("FINAL ANSWER: ", res)
    return {"response": res}

@app.post("/test")
async def fetchAmazon(input: StringInput):
    res='''<p><strong>Summary of Amazon Reviews:</strong></p>
    <p>The Apple iPhone 15 Pro is highly praised for its exceptional features and performance, earning an average rating of 4.3 out of 5 stars. Customers rave about its    stunning display, powerful camera system, blazing-fast processor, and customizable action button. Many report smooth performance, long battery life, and seamless data     transfer services from Amazon. However, a few users have reported overheating issues while charging and during certain tasks, as well as concerns about the fragility of    the camera lens.</p>
    <p><strong>Pros and Cons Table:</strong></p>
    <table>
    <thead>
    <tr>
    <th>Feature</th>
    <th>Pros</th>
    <th>Cons</th>
    </tr>
    </thead>
    <tbody>
    <tr>
    <td>Design</td>
    <td>Titanium construction, textured matte-glass back, Ceramic Shield front, water and dust resistance</td>
    <td></td>
    </tr>
    <tr>
    <td>Display</td>
    <td>6.1" Super Retina XDR display, 120Hz refresh rate, Dynamic Island, Always-On display</td>
    <td></td>
    </tr>
    <tr>
    <td>Processor</td>
    <td>A17 Pro chip, powerful GPU, efficient performance</td>
    <td></td>
    </tr>
    <tr>
    <td>Camera</td>
    <td>7 pro lenses, 48MP Main camera, advanced framing flexibility, sharper close-ups</td>
    <td>Overheating concerns</td>
    </tr>
    <tr>
    <td>Battery</td>
    <td>All-day battery life</td>
    <td></td>
    </tr>
    <tr>
    <td>Action Button</td>
    <td>Customizable to quickly access favorite features</td>
    <td></td>
    </tr>
    <tr>
    <td>Fragility</td>
    <td>Concerns about camera lens durability</td>
    <td></td>
    </tr>
    </tbody>
    </table>
    <p><strong>Score:</strong></p>
    <p>Based on the positive reviews and impressive features, I would rate the Apple iPhone 15 Pro an 8 out of 10, highly recommending it for those seeking a premium   smartphone experience.</p>
    '''
    
    return {"response": res}

# uvicorn backend:app --reload
