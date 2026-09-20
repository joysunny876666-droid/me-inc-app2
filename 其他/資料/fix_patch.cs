using System;
using System.IO;

class Program
{
    static void Main()
    {
        string[] lines = File.ReadAllLines("diff_recovered.txt");
        for (int i = 0; i < lines.Length; i++)
        {
            if (lines[i].Length == 0)
            {
                lines[i] = " ";
            }
        }
        File.WriteAllLines("diff_fixed.txt", lines);
    }
}
