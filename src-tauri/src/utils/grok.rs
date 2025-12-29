use std::path::PathBuf;
use serde_json::json;

#[allow(dead_code)]
pub async fn init_groq(_api_key_path: &PathBuf) -> Result<(), String> {
    // Groq initialization will be handled by the Node.js puppeteer script
    // since we're using the groq-sdk npm package
    Ok(())
}

#[allow(dead_code)]
pub async fn get_text_from_img(img_data: Vec<u8>, api_key: &str) -> Result<Option<String>, String> {
    use base64::{Engine as _, engine::general_purpose};
    let base64_string = general_purpose::STANDARD.encode(&img_data);
    
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": "meta-llama/llama-4-scout-17b-16e-instruct",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Write me the text in the image, return the following JSON: {\"text\": \"\"}"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": format!("data:image/png;base64,{}", base64_string)
                            }
                        }
                    ]
                }
            ],
            "response_format": {
                "type": "json_object"
            },
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to send request to Groq API: {}", e))?;

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let text = response_json
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.get(0))
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|content| {
            let content_str = content.as_str()?;
            let parsed: serde_json::Value = serde_json::from_str(content_str).ok()?;
            parsed.get("text")?.as_str().map(|s| s.to_string())
        });

    Ok(text)
}

