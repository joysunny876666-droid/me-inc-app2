using System;
using System.IO;
using System.Text;

class Program
{
    static void Main()
    {
        Encoding big5 = Encoding.GetEncoding(950);
        string[] files = { "app.js", "index.html", "style.css" };
        foreach (var file in files)
        {
            if (File.Exists(file))
            {
                byte[] bytes = File.ReadAllBytes(file);
                // Check if it's already UTF-8
                bool isUtf8 = false;
                try {
                    string utf8 = Encoding.UTF8.GetString(bytes);
                    if (!utf8.Contains("\uFFFD")) isUtf8 = true;
                } catch {}
                
                if (!isUtf8)
                {
                    string text = big5.GetString(bytes);
                    File.WriteAllText(file, text, new UTF8Encoding(false));
                    Console.WriteLine("Converted " + file + " to UTF-8.");
                } else {
                    Console.WriteLine(file + " is already UTF-8.");
                }
            }
        }
    }
}
