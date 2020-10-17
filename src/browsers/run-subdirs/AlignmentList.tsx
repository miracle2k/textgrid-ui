import React from "react";

export function AlignmentList() {
  return <div style={{padding: '20px'}}>
    <h4>Alignments</h4>
    <table>
      <thead>
        <tr>
          <th>
            Model
          </th>
          <th>
            All
          </th>
          <th>
            Storybooks
          </th>
          <th>
            Pronunciations
          </th>
          <th>
            Various
          </th>
        </tr>
      </thead>
      <tbody>
      <tr>
        <td>
          run 1
        </td>
        <td>
          99% / 45%
        </td>
        <td>
          99% / 45%
        </td>
        <td>
          99% / 45%
        </td>
        <td>
          99% / 45%
        </td>
      </tr>
      </tbody>
    </table>
  </div>
}