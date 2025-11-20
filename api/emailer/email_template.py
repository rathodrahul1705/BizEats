def build_email_html(
    logo_url: str,
    title: str,
    message: str,
    button_text: str = None,
    button_url: str = None,
    image_url: str = None,       # NEW — image preview section
    footer_text: str = "Thanks for using Bizeats!",
):
    """
    Returns a modern, sexy, mobile-responsive HTML email template
    with image preview, clickable image, and updated gradients.
    """

    return f"""
<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0;">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<style>
/* ---------------------------
   RESET + BASE
----------------------------*/
body {{
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #FF6B35, #FF512F, #DD2476);
    font-family: 'Helvetica Neue', Arial, sans-serif;
}}

.container {{
    max-width: 600px;
    margin: 35px auto;
    padding: 30px 25px;
    border-radius: 24px;

    /* GLASS EFFECT */
    background: rgba(255,255,255,0.90);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);

    box-shadow: 0px 22px 48px rgba(0,0,0,0.18);
}}

/* LOGO */
.logo {{
    text-align: center;
    margin-bottom: 28px;
}}
.logo img {{
    width: 170px;
    height: auto;
}}

/* TITLE */
.title {{
    font-size: 30px;
    font-weight: 800;
    text-align: center;
    margin-bottom: 18px;
    color: #111;
    letter-spacing: -0.4px;
}}

/* MESSAGE */
.message {{
    font-size: 17px;
    line-height: 1.7;
    margin-bottom: 32px;
    color: #444;
    text-align: center;
}}

/* IMAGE PREVIEW */
.image-preview {{
    margin: 30px 0;
    text-align: center;
}}
.image-preview img {{
    width: 100%;
    max-width: 520px;
    border-radius: 18px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.15);
    transition: 0.25s ease-in-out;
}}
.image-preview img:hover {{
    transform: scale(1.02);
}}

/* BUTTON */
.button-container {{
    text-align: center;
    margin: 38px 0;
}}
.button {{
    display: inline-block;

    background: linear-gradient(135deg, #FF6B35, #FF512F, #DD2476);
    padding: 16px 40px;

    border-radius: 50px;
    color: white;
    font-size: 17px;
    text-decoration: none;
    font-weight: 700;

    box-shadow: 0 8px 20px rgba(255, 80, 80, 0.3);
    transition: 0.25s ease-in-out;
}}
.button:hover {{
    transform: translateY(-3px);
    box-shadow: 0 14px 26px rgba(221,36,118,0.45);
}}

/* FOOTER */
.footer {{
    margin-top: 35px;
    text-align: center;
    font-size: 14px;
    color: #777;
    line-height: 1.6;
}}
.footer a {{
    color: #DD2476;
    text-decoration: none;
}}
</style>

</head>

<body>

<div class="container">

    <div class="logo">
        <img src="{logo_url}" alt="Bizeats" />
    </div>

    <div class="title">{title}</div>

    <div class="message">{message}</div>

    {f'''
    <div class="image-preview">
        <a href="{image_url}" target="_blank">
            <img src="{image_url}" alt="Attachment" />
        </a>
    </div>
    ''' if image_url else ''}

    {f'''
    <div class="button-container">
        <a href="{button_url}" class="button">{button_text}</a>
    </div>
    ''' if button_text and button_url else ''}

    <div class="footer">
        {footer_text}<br/>
        © 2025 Vensavor FooTtech LLP. All rights reserved.
    </div>

</div>

</body>
</html>
"""
