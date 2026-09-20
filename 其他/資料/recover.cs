using System;
using System.IO;
using System.Text;

class Program
{
    static void Main()
    {
        string text = File.ReadAllText("diff.txt", Encoding.Unicode);
        Encoding big5 = Encoding.GetEncoding(950);
        byte[] originalBytes = big5.GetBytes(text);
        string utf8Text = Encoding.UTF8.GetString(originalBytes);
        Console.WriteLine(utf8Text.Substring(0, Math.Min(1000, utf8Text.Length)));
        File.WriteAllText("diff_recovered.txt", utf8Text, Encoding.UTF8);
    }
}
