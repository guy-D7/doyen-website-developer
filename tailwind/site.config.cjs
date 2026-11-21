// Tailwind theme for public/index.html (was the page's inline Play-CDN config)
module.exports = { content: ['./src/index.html'], ...({
            theme: { extend: {
                fontFamily: { sans: ['Archivo','sans-serif'], display: ['Archivo','sans-serif'] },
                colors: {
                    stone: { 50:'#FFFFFF',100:'#F4F4F4',200:'#E5E5E5',300:'#D4D4D4',400:'#A3A3A3',500:'#737373',600:'#525252',700:'#404040',800:'#2A2A2A',900:'#1E1E1E',950:'#141414' },
                    accent: { DEFAULT:'#D62828', hover:'#A81F1F', soft:'#FDECEC' }
                }
            } }
        }) };
