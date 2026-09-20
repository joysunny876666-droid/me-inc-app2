using System;
using System.IO;
using System.Text;

class Program
{
    static void Main()
    {
        Encoding big5 = Encoding.GetEncoding(950);
        string text = File.ReadAllText("modules/08_flowchart_v4.js", big5);
        File.WriteAllText("modules/08_flowchart_v4_utf8.js", text, Encoding.UTF8);
        Console.WriteLine(text.Substring(0, Math.Min(500, text.Length)));
    }
}
