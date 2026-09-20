\ = '..\..\brain\e0c23eb0-ebf9-4a25-8b12-766f659ee509\.system_generated\logs\transcript_full.jsonl'
\ = Get-Content \

foreach (\ in \) {
    if (\ -match '"name":"multi_replace_file_content"') {
        if (\ -match 'app\.js') {
            # simple string splitting to find ReplacementContent
            \ = \ -split '"ReplacementContent":"'
            for (\ = 1; \ -lt \.Length; \++) {
                \ = \[\].IndexOf('","StartLine"')
                if (\ -eq -1) {
                    \ = \[\].IndexOf('"}')
                }
                if (\ -gt 0) {
                    \ = \[\].Substring(0, \)
                    # Convert JSON escaped string back to normal
                    \ = \ -replace '\\n', "
" -replace '\\r', "" -replace '\\"', """ -replace '\\\\', "\"
                    Write-Output "--- REPLACEMENT CHUNK ---"
                    Write-Output \
                }
            }
        }
    }
}
